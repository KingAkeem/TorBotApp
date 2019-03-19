package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"

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

func getLinks(body io.Reader) []string {
	tokenizer := html.NewTokenizer(body)
	links := make([]string, 0)
	for {
		tt := tokenizer.Next()
		switch tt {
		case html.ErrorToken:
			return links
		case html.StartTagToken:
			token := tokenizer.Token()
			isLink := token.Data == "a"
			if isLink {
				for _, attr := range token.Attr {
					if attr.Key == "href" {
						links = append(links, attr.Val)
					}
				}
			}
		}
	}
}

func getLinksHandler(w http.ResponseWriter, r *http.Request) {
	upgrader.CheckOrigin = func(r *http.Request) bool { return true }
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatalf("Error: %+v", err)
	}
	defer conn.Close()
	url := r.URL.Query().Get("url")
	resp, err := client.Get(url)
	if err != nil {
		log.Fatalf("Error: %+v", err)
	}
	defer resp.Body.Close()
	links := getLinks(resp.Body)
	if err != nil {
		log.Fatalf("Error: %+v", err)
	}
	log.Printf("Links found: %+v", links)
	conn.WriteMessage(websocket.TextMessage, []byte("Hello World."))
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
