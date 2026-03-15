package main

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"os/signal"
	"runtime"
	"sync"
	"syscall"
)

type service struct {
	name string
	dir  string
	cmd  string
	args []string
}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	services := []service{
		{
			name: "backend",
			dir:  "backend",
			cmd:  "go",
			args: []string{"run", "./cmd/server"},
		},
		{
			name: "frontend",
			dir:  "frontend",
			cmd:  npmCommand(),
			args: []string{"run", "dev"},
		},
	}

	fmt.Println("Starting development services...")
	fmt.Println("Frontend: http://localhost:3000")
	fmt.Println("Backend:  http://localhost:8080")
	fmt.Println("Press Ctrl+C to stop both.")

	var wg sync.WaitGroup
	errCh := make(chan error, len(services))

	for _, svc := range services {
		wg.Add(1)
		go func(s service) {
			defer wg.Done()
			if err := runService(ctx, s); err != nil {
				errCh <- fmt.Errorf("%s: %w", s.name, err)
			}
		}(svc)
	}

	select {
	case <-ctx.Done():
	case err := <-errCh:
		fmt.Printf("Service failed: %v\n", err)
		stop()
	}

	wg.Wait()
}

func runService(ctx context.Context, svc service) error {
	cmd := exec.CommandContext(ctx, svc.cmd, svc.args...)
	cmd.Dir = svc.dir

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}

	if err := cmd.Start(); err != nil {
		return err
	}

	var wg sync.WaitGroup
	wg.Add(2)
	go streamOutput(&wg, svc.name, stdout)
	go streamOutput(&wg, svc.name, stderr)
	wg.Wait()

	if err := cmd.Wait(); err != nil && ctx.Err() == nil {
		return err
	}

	return nil
}

func streamOutput(wg *sync.WaitGroup, prefix string, reader io.Reader) {
	defer wg.Done()

	scanner := bufio.NewScanner(reader)
	for scanner.Scan() {
		fmt.Printf("[%s] %s\n", prefix, scanner.Text())
	}
}

func npmCommand() string {
	if runtime.GOOS == "windows" {
		return "npm.cmd"
	}
	return "npm"
}
