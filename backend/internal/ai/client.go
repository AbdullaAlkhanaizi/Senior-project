package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

var ErrNotConfigured = errors.New("gemini api key is not configured")

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatRequest struct {
	SystemPrompt string
	Messages     []Message
}

type ChatResponse struct {
	Model   string
	Message Message
}

type Client struct {
	apiKey     string
	baseURL    string
	model      string
	httpClient *http.Client
}

func NewClient(apiKey, baseURL, model string) *Client {
	return &Client{
		apiKey:  strings.TrimSpace(apiKey),
		baseURL: strings.TrimRight(strings.TrimSpace(baseURL), "/"),
		model:   strings.TrimSpace(model),
		httpClient: &http.Client{
			Timeout: 45 * time.Second,
		},
	}
}

func (c *Client) Model() string {
	return c.model
}

func (c *Client) Chat(ctx context.Context, req ChatRequest) (ChatResponse, error) {
	if c == nil || c.apiKey == "" {
		return ChatResponse{}, ErrNotConfigured
	}

	payload := chatCompletionRequest{
		Model: c.model,
		Messages: append([]Message{
			{
				Role:    "system",
				Content: req.SystemPrompt,
			},
		}, req.Messages...),
	}

	rawPayload, err := json.Marshal(payload)
	if err != nil {
		return ChatResponse{}, err
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/chat/completions", bytes.NewReader(rawPayload))
	if err != nil {
		return ChatResponse{}, err
	}

	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return ChatResponse{}, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return ChatResponse{}, err
	}

	if resp.StatusCode >= http.StatusBadRequest {
		var apiErr chatCompletionErrorResponse
		if err := json.Unmarshal(body, &apiErr); err == nil && strings.TrimSpace(apiErr.Error.Message) != "" {
			return ChatResponse{}, fmt.Errorf("gemini api error: %s", apiErr.Error.Message)
		}
		return ChatResponse{}, fmt.Errorf("gemini api error: status %d", resp.StatusCode)
	}

	var completion chatCompletionResponse
	if err := json.Unmarshal(body, &completion); err != nil {
		return ChatResponse{}, err
	}
	if len(completion.Choices) == 0 || strings.TrimSpace(completion.Choices[0].Message.Content) == "" {
		return ChatResponse{}, errors.New("gemini returned an empty response")
	}

	return ChatResponse{
		Model:   completion.Model,
		Message: completion.Choices[0].Message,
	}, nil
}

type chatCompletionRequest struct {
	Model    string    `json:"model"`
	Messages []Message `json:"messages"`
}

type chatCompletionResponse struct {
	Model   string `json:"model"`
	Choices []struct {
		Message Message `json:"message"`
	} `json:"choices"`
}

type chatCompletionErrorResponse struct {
	Error struct {
		Message string `json:"message"`
	} `json:"error"`
}
