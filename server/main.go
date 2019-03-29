package main

import (
	"encoding/json"
	"io"
	"log"
	"net/http"
	"strings"

	"github.com/TorBotApp/server/lib/links"
	"github.com/TorBotApp/server/lib/utils"
	"github.com/TorBotApp/server/lib/websocket"

	"golang.org/x/net/html"
)

var client = utils.NewTorClient("tcp", "127.0.0.1", "9050")

func getEmails(body io.Reader, dataCh chan<- string) {
	tokenizer := html.NewTokenizer(body)
	for {
		tt := tokenizer.Next()
		switch tt {
		case html.ErrorToken:
			close(dataCh)
			return
		case html.StartTagToken:
			token := tokenizer.Token()
			for _, attr := range token.Attr {
				if strings.Contains(attr.Val, "mailto") {
					email := strings.Split(attr.Val, ":")[1]
					dataCh <- email
				}
			}
		}
	}
}

func getEmailsHandler(w http.ResponseWriter, r *http.Request) {
	wsConn, err := websocket.UpgradeConnection(w, r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Fatal(err)
	}
	defer wsConn.Close()
	url := r.URL.Query().Get("url")
	resp, err := client.Get(url)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		log.Fatal(err)
	}
	defer resp.Body.Close()
	w.Write([]byte("Finished"))
}

type Message interface {
	Read() ([]byte, int)
}

const SempahoreCount = 5

func getLinksHandler(w http.ResponseWriter, r *http.Request) {
	ws, err := websocket.UpgradeConnection(w, r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Fatal(err)
	}
	defer ws.Close()
	url := r.URL.Query().Get("url")
	resp, err := client.Get(url)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		log.Fatal(err)
	}
	defer resp.Body.Close()
	ch := make(chan string)
	go links.GetLinks(resp.Body, ch)
	semaphore := utils.NewSemaphore(SempahoreCount)
	for url := range ch {
		semaphore.Lock()
		go func(url string, client *http.Client) {
			msg := links.CreateLinkMessage(url, client)
			ws.Write(msg)
			semaphore.Unlock()
		}(url, client)
	}
}

func getInfoHandler(w http.ResponseWriter, r *http.Request) {
	url := r.URL.Query().Get("url")
	resp, err := client.Head(url)
	w.Header().Set("Content-Type", "application/json")
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Fatal(err)
	}

	json, err := json.Marshal(resp.Header)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Fatal(err)
	}
	w.Write(json)
}

func main() {
	http.HandleFunc("/emails", getEmailsHandler)
	http.HandleFunc("/links", getLinksHandler)
	http.HandleFunc("/info", getInfoHandler)
	log.Print("Serving on port :8080\n")
	log.Fatal(http.ListenAndServe(":8080", nil))
}