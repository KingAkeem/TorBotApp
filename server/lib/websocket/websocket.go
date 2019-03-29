package websocket

import (
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{}

// WSConn is a concurreny safe WebSocketConnection
type WSConn struct {
	sync.Mutex
	conn *websocket.Conn
}

// WSMessage is a WebSocket Message
type WSMessage interface {
	Read() ([]byte, int)
}

// Write writes a message to a WebSocketConnection
func (ws *WSConn) Write(msg WSMessage) int {
	bytes, bytesRead := msg.Read()
	if bytesRead == 0 {
		return bytesRead
	}
	ws.Lock()
	ws.conn.WriteMessage(websocket.TextMessage, bytes)
	ws.Unlock()
	return bytesRead
}

// Close closes the underlying connection
func (ws *WSConn) Close() error {
	return ws.conn.Close()
}

// UpgradeConnection upgrades a regular http request to a WebSocket connection
func UpgradeConnection(w http.ResponseWriter, r *http.Request) (*WSConn, error) {
	upgrader.CheckOrigin = func(r *http.Request) bool { return true }
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return nil, err
	}
	websocketConn := &WSConn{conn: conn}
	return websocketConn, nil
}
