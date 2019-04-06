package emails

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestReadEmailMessage(t *testing.T) {
	testEmail := NewEmailMessage("This is a test email.")
	emailBytes, emailLength := testEmail.Read()
	expectedBytes, err := json.Marshal(testEmail)
	if err != nil {
		t.Error("Error marshalling email into JSON.")
	}
	errorMsg := "Error: actual number of bytes is %+v and expected number of bytes is %+v."
	expectedLength := len(expectedBytes)
	assert.Equalf(t, emailLength, expectedLength, errorMsg, emailLength, expectedLength)
	errorMsg = "Error: email is %+v and expected email should be %+v."
	assert.Equalf(t, emailBytes, expectedBytes, errorMsg, emailBytes, expectedBytes)
}
