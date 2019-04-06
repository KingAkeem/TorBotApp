package emails

import (
	"encoding/json"
	"io/ioutil"
	"log"
	"os"
	"testing"
	"text/template"

	"github.com/stretchr/testify/assert"
)

func TestReadEmailMessage(t *testing.T) {
	testEmail := NewEmailMessage("This is a test email.")
	emailBytes, emailLength := testEmail.Read()
	expectedBytes, err := json.Marshal(testEmail)
	if err != nil {
		t.Errorf("Error marshalling email into JSON, %+v", err)
	}
	errorMsg := "Error: actual number of bytes is %+v and expected number of bytes is %+v."
	expectedLength := len(expectedBytes)
	assert.Equalf(t, emailLength, expectedLength, errorMsg, emailLength, expectedLength)
	errorMsg = "Error: email is %+v and expected email should be %+v."
	assert.Equalf(t, emailBytes, expectedBytes, errorMsg, emailBytes, expectedBytes)
}

type MockEmails struct {
	Emails []string
}

const htmlTemp = `<!DOCTYPE html><html>
	<body>
		<title>This is a test file.</title>
		<p>
			{{range .Emails}}
			His email is <a href="mailto:{{.}}">{{.}}</a>
			{{end}}
		<p>
	</body>
</html>
`

func TestGetEmails(t *testing.T) {
	emails := MockEmails{
		Emails: []string{"test@something.com", "mock@mocking.com", "business@this.org"},
	}

	temp := template.New("Email template")
	temp, err := temp.Parse(htmlTemp)
	if err != nil {
		t.Errorf("Error parsing HTML template, %+v", err)
	}
	f, err := os.Create("./temp.html")
	defer f.Close()
	defer os.Remove(f.Name())
	if err != nil {
		t.Errorf("Error creating HTML file, %+v", err)
	}
	err = temp.Execute(f, emails)
	if err != nil {
		t.Errorf("Error executing HTML template, %+v", err)
	}
	bytes, err := ioutil.ReadFile(f.Name())
	if err != nil {
		t.Errorf("Error reading file, %+v", err)
	}
	log.Printf("File Contents:\n%+v\n", string(bytes))
}
