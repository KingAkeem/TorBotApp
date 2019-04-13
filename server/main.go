package main

import (
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/TorBotApp/server/lib/emails"
	"github.com/TorBotApp/server/lib/links"
	"github.com/TorBotApp/server/lib/utils"
	"github.com/TorBotApp/server/lib/websocket"
)

var (
	client         *http.Client
	semaphoreCount int
)

func init() {
	address := os.Getenv("TOR_ADDRESS")
	port := os.Getenv("TOR_PORT")
	client = utils.NewTorClient("tcp", address, port)
	var err error
	semaphoreCount, err = strconv.Atoi(os.Getenv("GET_LINKS_CONCURRENCY"))
	if err != nil {
		log.Fatalf("Invalid number used for GET_LINKS_CONCURRENCY. Error: %+v", err)
	}
}

func getEmailsHandler(w http.ResponseWriter, r *http.Request) {
	ws, err := websocket.UpgradeConnection(w, r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Print(err)
	}
	defer ws.Close()
	url := r.URL.Query().Get("url")
	resp, err := client.Get(url)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		log.Print(err)
	}
	defer resp.Body.Close()
	ch := make(chan string)
	go emails.GetEmails(resp.Body, ch)
	for email := range ch {
		go func(email string) {
			msg := emails.NewEmailMessage(email)
			ws.Write(msg)
		}(email)
	}
}

func getLinksHandler(w http.ResponseWriter, r *http.Request) {
	ws, err := websocket.UpgradeConnection(w, r)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Print(err)
	}
	defer ws.Close()
	url := r.URL.Query().Get("url")
	resp, err := client.Get(url)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		log.Print(err)
	}
	defer resp.Body.Close()
	ch := make(chan string)
	go links.GetLinks(resp.Body, ch)
	semaphore := utils.NewSemaphore(semaphoreCount)
	for url := range ch {
		semaphore.Lock()
		go func(url string, client *http.Client) {
			msg := links.NewLinkMessage(url, client)
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
		log.Print(err)
	}

	json, err := json.Marshal(resp.Header)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		log.Print(err)
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
