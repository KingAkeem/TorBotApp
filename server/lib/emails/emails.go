package emails

import (
	"encoding/json"
	"io"
	"strings"

	"golang.org/x/net/html"
)

// EmailMessage writes an email to a WebSocketConnection
type EmailMessage struct {
	Email string `json:"email"`
}

func (e *EmailMessage) Read() ([]byte, int) {
	bytes, err := json.Marshal(e)
	if err != nil {
		return []byte{}, 0
	}
	return bytes, len(bytes)
}

// NewEmailMessage creates a new EmailMessage for WebSocket consumption
func NewEmailMessage(email string) *EmailMessage {
	return &EmailMessage{Email: email}
}

// IsEmail determines if a given HTML attribute has an an email value.
func IsEmail(htmlTag html.Attribute) bool {
	return strings.Contains(htmlTag.Val, "mailto:")
}

// GetEmails feeds a channel with emails found in the body
func GetEmails(body io.Reader, emailFeed chan<- string) {
	tokenizer := html.NewTokenizer(body)
	for {
		tt := tokenizer.Next()
		switch tt {
		case html.ErrorToken:
			close(emailFeed)
			return
		case html.StartTagToken:
			token := tokenizer.Token()
			for _, attr := range token.Attr {
				if IsEmail(attr) {
					email := strings.Split(attr.Val, ":")[1]
					emailFeed <- email
				}
			}
		}
	}
}
