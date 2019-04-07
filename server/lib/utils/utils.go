package utils

import (
	"fmt"
	"log"
	"net/http"

	"golang.org/x/net/proxy"
)

// NewTorClient creates an client using the SOCKS5 proxy
func NewTorClient(protocol string, address string, port string) *http.Client {
	dialer, err := proxy.SOCKS5(protocol, fmt.Sprintf("%s:%s", address, port), nil, proxy.Direct)
	if err != nil {
		log.Fatal(err)
		return nil
	}

	tr := &http.Transport{
		Dial: dialer.Dial,
	}
	return &http.Client{Transport: tr}
}

// Semaphore controls number of resources being used
type Semaphore struct {
	locks chan struct{}
}

// Lock adds lock to channel
func (s *Semaphore) Lock() {
	s.locks <- struct{}{}
}

// Unlock removes lock from channel
func (s *Semaphore) Unlock() {
	<-s.locks
}

// NewSemaphore creates a new Semaphore with the number of resources given
func NewSemaphore(resources int) *Semaphore {
	return &Semaphore{locks: make(chan struct{}, resources)}
}
