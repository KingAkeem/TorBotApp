package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"sync"

	"github.com/asaskevich/govalidator"
	"github.com/gorilla/websocket"
	"golang.org/x/net/html"
	"golang.org/x/net/proxy"
)

var client = createTorClient("tcp", "127.0.0.1", "9050")
var upgrader = websocket.Upgrader{}

func createTorClient(protocol string, address string, port string) *http.Client {
	dialer, err := proxy.SOCKS5(protocol, address+":"+port, nil, proxy.Direct)
	if err != nil {
		log.Fatal(err)
	}

	tr := &http.Transport{
		Dial: dialer.Dial,
	}
	return &http.Client{Transport: tr}
}

func getLinks(body io.Reader, dataCh chan<- string) {
	tokenizer := html.NewTokenizer(body)
	for {
		tt := tokenizer.Next()
		switch tt {
		case html.ErrorToken:
			close(dataCh)
			return
		case html.StartTagToken:
			token := tokenizer.Token()
			isLink := token.Data == "a"
			if isLink {
				for _, attr := range token.Attr {
					if govalidator.IsRequestURL(attr.Val) && attr.Key == "href" {
						dataCh <- attr.Val
					}
				}
			}
		}
	}
}

type WSConn struct {
	sync.Mutex
	conn *websocket.Conn
}

func (ws *WSConn) writeMessage(msg Message) {
	msgStr, err := json.Marshal(msg)
	if err != nil {
		log.Fatalf("Error: %+v", err)
	}
	ws.Lock()
	ws.conn.WriteMessage(websocket.TextMessage, msgStr)
	ws.Unlock()
}

func (ws *WSConn) Close() error {
	return ws.conn.Close()
}

func upgradeConnection(w http.ResponseWriter, r *http.Request) (*WSConn, error) {
	upgrader.CheckOrigin = func(r *http.Request) bool { return true }
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return nil, err
	}
	websocketConn := &WSConn{conn: conn}
	return websocketConn, err
}

type Message struct {
	Link   string `json::"link"`
	Status string `json::"status"`
}

func createLinkMessage(url string) (msg Message) {
	resp, err := client.Get(url)
	msg = Message{Link: url}
	if err != nil {
		msg.Status = err.Error()
	} else {
		msg.Status = resp.Status
	}
	return
}

type Semaphore struct {
	locks chan struct{}
}

func (s *Semaphore) Lock() {
	s.locks <- struct{}{}
}

func (s *Semaphore) Unlock() {
	<-s.locks
}

func newSemaphore(resourceCount int) *Semaphore {
	return &Semaphore{locks: make(chan struct{}, resourceCount)}
}

const SempahoreCount = 3

func getLinksHandler(w http.ResponseWriter, r *http.Request) {
	ws, err := upgradeConnection(w, r)
	if err != nil {
		log.Fatalf("Error: %+v", err)
	}
	defer ws.Close()
	url := r.URL.Query().Get("url")
	resp, err := client.Get(url)
	if err != nil {
		log.Fatalf("Error: %+v", err)
	}
	defer resp.Body.Close()
	ch := make(chan string)
	go getLinks(resp.Body, ch)
	semaphore := newSemaphore(SempahoreCount)
	for url := range ch {
		semaphore.Lock()
		go func() {
			msg := createLinkMessage(url)
			ws.writeMessage(msg)
			semaphore.Unlock()
		}()
	}
}

func getInfoHandler(w http.ResponseWriter, r *http.Request) {
	url := r.URL.Query().Get("url")
	resp, err := client.Head(url)
	w.Header().Set("Content-Type", "application/json")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	json, err := json.Marshal(resp.Header)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Write(json)
}

func main() {
	http.HandleFunc("/links", getLinksHandler)
	http.HandleFunc("/info", getInfoHandler)
	log.Print("Serving on port :8080\n")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
