package transmitter

import (
	"context"
	"fmt"
	"log"
	"net/url"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Client handles streaming events to the FastAPI backend over WebSocket.
type Client struct {
	serverURL string
	conn      *websocket.Conn
	mu        sync.Mutex
	sendChan  chan []byte
	stopChan  chan struct{}
}

// NewClient initializes a new transmitter client.
func NewClient(serverHost string, bufferSize int) *Client {
	u := url.URL{Scheme: "ws", Host: serverHost, Path: "/ws/agent"}
	return &Client{
		serverURL: u.String(),
		sendChan:  make(chan []byte, bufferSize),
		stopChan:  make(chan struct{}),
	}
}

// Start begins the persistent connection and read/write loops.
func (c *Client) Start(ctx context.Context) error {
	log.Printf("[Transmitter] Connecting to backend at %s", c.serverURL)
	conn, _, err := websocket.DefaultDialer.Dial(c.serverURL, nil)
	if err != nil {
		return fmt.Errorf("websocket dial failed: %w", err)
	}
	c.conn = conn

	go c.writeLoop(ctx)
	return nil
}

// Send queues an event payload to be transmitted.
func (c *Client) Send(payload []byte) bool {
	select {
	case c.sendChan <- payload:
		return true
	default:
		// Queue full, event dropped to prevent stalling kernel reader
		return false
	}
}

func (c *Client) writeLoop(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case <-ctx.Done():
			return
		case <-c.stopChan:
			return
		case msg := <-c.sendChan:
			c.mu.Lock()
			c.conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
			err := c.conn.WriteMessage(websocket.TextMessage, msg)
			c.mu.Unlock()
			if err != nil {
				log.Printf("[Transmitter] Write error: %v", err)
				return
			}
		case <-ticker.C:
			c.mu.Lock()
			c.conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
			err := c.conn.WriteMessage(websocket.PingMessage, nil)
			c.mu.Unlock()
			if err != nil {
				return
			}
		}
	}
}

// Close gracefully closes the connection.
func (c *Client) Close() {
	close(c.stopChan)
	if c.conn != nil {
		c.conn.Close()
	}
}
