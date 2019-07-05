import { SimpleResponse } from "./simpleRequest";

/**
 * This function provides a simple interface to perform a HTTP request.
 */

 const getHeaderMap = (headers: string): Map<string, string> => {
    const arr = headers.trim().split(/[\r\n]+/);
    const headerMap = new Map<string, string>();

    arr.forEach(line => {
      var parts = line.split(': ');
      var header = parts.shift();
      var value = parts.join(': ');
      headerMap.set(header, value);
    });

    return headerMap;
};

const makeRequest = (method: string, url: string, data?: string): Promise<SimpleResponse> => {
    return new Promise(function (resolve, reject) {
            const req = new XMLHttpRequest();
            req.open(method, url);
            req.onload = function() {
                if (this.status >= 200 && this.status < 300) {
                    resolve({
                        origin: url,
                        headers: getHeaderMap(req.getAllResponseHeaders()),
                        statusCode: req.status,
                        body: req.responseText
                    });
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