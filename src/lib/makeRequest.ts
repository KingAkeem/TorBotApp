/**
 * This function provides a simple interface to perform a HTTP request.
 */
const makeRequest = (method: string, url: string, data?: string): Promise<OriginRequest> => {
    return new Promise(function (resolve, reject) {
            const req = newOriginRequest(url);
            req.open(method, url);
            req.onload = function() {
                if (this.status >= 200 && this.status < 300) {
                    resolve(req);
                } else { 
                    reject(req);               
                }
            };
            req.onerror = () => reject(req)
            if (data) req.send(JSON.stringify(data));
            else req.send();
        });
}

export default makeRequest;