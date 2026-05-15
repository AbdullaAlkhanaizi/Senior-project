package httpapi

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"senior-project/backend/internal/models"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow CORS
	},
}

type wsClient struct {
	conn *websocket.Conn
	send chan []byte
}

type wsHub struct {
	sync.RWMutex
	cases     map[int64]map[*wsClient]bool
	caseLists map[string]map[*wsClient]bool
}

func newWSHub() *wsHub {
	return &wsHub{
		cases:     make(map[int64]map[*wsClient]bool),
		caseLists: make(map[string]map[*wsClient]bool),
	}
}

func (h *wsHub) addClient(caseID int64, c *wsClient) {
	h.Lock()
	defer h.Unlock()
	if _, ok := h.cases[caseID]; !ok {
		h.cases[caseID] = make(map[*wsClient]bool)
	}
	h.cases[caseID][c] = true
}

func (h *wsHub) removeClient(caseID int64, c *wsClient) {
	h.Lock()
	defer h.Unlock()
	if clients, ok := h.cases[caseID]; ok {
		delete(clients, c)
		if len(clients) == 0 {
			delete(h.cases, caseID)
		}
	}
	close(c.send)
}

func (h *wsHub) broadcastToCase(caseID int64, message []byte) {
	h.RLock()
	defer h.RUnlock()
	if clients, ok := h.cases[caseID]; ok {
		for c := range clients {
			select {
			case c.send <- message:
			default:
				// Channel blocked
			}
		}
	}
}

func (h *wsHub) addCaseListClient(key string, c *wsClient) {
	h.Lock()
	defer h.Unlock()
	if _, ok := h.caseLists[key]; !ok {
		h.caseLists[key] = make(map[*wsClient]bool)
	}
	h.caseLists[key][c] = true
}

func (h *wsHub) removeCaseListClient(key string, c *wsClient) {
	h.Lock()
	defer h.Unlock()
	if clients, ok := h.caseLists[key]; ok {
		delete(clients, c)
		if len(clients) == 0 {
			delete(h.caseLists, key)
		}
	}
	close(c.send)
}

func (h *wsHub) broadcastToCaseList(key string, message []byte) {
	h.RLock()
	defer h.RUnlock()
	if clients, ok := h.caseLists[key]; ok {
		for c := range clients {
			select {
			case c.send <- message:
			default:
			}
		}
	}
}

func (c *wsClient) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func (c *wsClient) readPump(hub *wsHub, caseID int64) {
	defer func() {
		hub.removeClient(caseID, c)
		c.conn.Close()
	}()
	c.conn.SetReadLimit(512)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error { c.conn.SetReadDeadline(time.Now().Add(60 * time.Second)); return nil })
	for {
		_, msg, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}
		hub.broadcastToCase(caseID, msg)
	}
}

func (c *wsClient) readCaseListPump(hub *wsHub, key string) {
	defer func() {
		hub.removeCaseListClient(key, c)
		c.conn.Close()
	}()
	c.conn.SetReadLimit(512)
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error { c.conn.SetReadDeadline(time.Now().Add(60 * time.Second)); return nil })
	for {
		if _, _, err := c.conn.ReadMessage(); err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}
	}
}

func (s *Server) handleCaseWS(w http.ResponseWriter, r *http.Request, caseID int64, current *viewer) {
	allowed, err := s.store.CanAccessCase(r.Context(), caseID, current.Role, current.ID, current.LawyerID)
	if err != nil || !allowed {
		writeError(w, http.StatusForbidden, "access denied")
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	client := &wsClient{
		conn: conn,
		send: make(chan []byte, 256),
	}

	s.wsHub.addClient(caseID, client)

	go client.writePump()
	go client.readPump(s.wsHub, caseID)
}

func (s *Server) handleCaseListWS(w http.ResponseWriter, r *http.Request) {
	current, err := s.requireViewer(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	if current.Role != models.RoleLawyer && current.Role != models.RoleClient {
		writeError(w, http.StatusForbidden, "access denied")
		return
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	client := &wsClient{
		conn: conn,
		send: make(chan []byte, 256),
	}

	key := caseListKey(current.Role, current.ID, current.LawyerID)
	s.wsHub.addCaseListClient(key, client)

	go client.writePump()
	go client.readCaseListPump(s.wsHub, key)
}

func (s *Server) broadcastMessage(caseID int64, msg interface{}) {
	b, err := json.Marshal(msg)
	if err != nil {
		log.Printf("error marshaling websocket message: %v", err)
		return
	}
	s.wsHub.broadcastToCase(caseID, b)
}

func (s *Server) broadcastCaseListRefresh(role string, userID, lawyerID int64) {
	key := caseListKey(role, userID, lawyerID)
	if key == "" {
		return
	}

	b, err := json.Marshal(map[string]any{
		"type": "cases:refresh",
	})
	if err != nil {
		log.Printf("error marshaling case list refresh message: %v", err)
		return
	}
	s.wsHub.broadcastToCaseList(key, b)
}

func caseListKey(role string, userID, lawyerID int64) string {
	switch role {
	case "lawyer":
		if lawyerID == 0 {
			return ""
		}
		return "lawyer:" + jsonNumber(lawyerID)
	case "client":
		if userID == 0 {
			return ""
		}
		return "client:" + jsonNumber(userID)
	default:
		return ""
	}
}

func jsonNumber(value int64) string {
	return fmt.Sprintf("%d", value)
}
