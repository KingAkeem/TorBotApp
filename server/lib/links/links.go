package links

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/TorBotApp/server/lib/utils"
	"github.com/asaskevich/govalidator"
	"golang.org/x/net/html"
)

// LinkMessage used to write links to WebSocket connection
type LinkMessage struct {
	Link   string `json:"link"`
	Status string `json:"status"`
}

// Read returns a byte array of the marshalled message and the number of bytes read.
func (l *LinkMessage) Read() ([]byte, int) {
	bytes, err := json.Marshal(l)
	if err != nil {
		return []byte{}, 0
	}
	return bytes, len(bytes)
}

// NewLinkMessage generates a link message from a given url
func NewLinkMessage(url string, client *http.Client) *LinkMessage {
	msg := &LinkMessage{Link: url}
	resp, err := client.Get(url)
	if err != nil {
		msg.Status = err.Error()
	} else {
		defer resp.Body.Close()
		msg.Status = resp.Status
	}
	return msg
}

// GetLinks parses resp.Body and feeds link status to channel
func GetLinks(body io.Reader, urlFeed chan<- string) {
	tokenizer := html.NewTokenizer(body)
	for {
		tt := tokenizer.Next()
		switch tt {
		case html.ErrorToken:
			close(urlFeed)
			return
		case html.StartTagToken:
			token := tokenizer.Token()
			isLink := token.Data == "a"
			if isLink {
				for _, attr := range token.Attr {
					if govalidator.IsRequestURL(attr.Val) && attr.Key == "href" && !utils.IsEmail(attr) {
						urlFeed <- attr.Val
					}
				}
			}
		}
	}
}
