import { Response } from "./Request";

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

export default (method: string, origin: string, data?: string): Promise<Response> => {
  return new Promise(function (resolve, reject) {
    const req = new XMLHttpRequest();
    req.open(method, origin);
    req.onload = function() {
      if (this.status >= 200 && this.status < 300) {
        const headers = getHeaderMap(req.getAllResponseHeaders()); 
        const statusCode = req.status;
        const body = req.responseText;
        resolve({ origin, headers, statusCode, body });
      } else { 
        reject(req);               
        }
      };
    req.onerror = () => reject(req)
    if (data) req.send(JSON.stringify(data));
    else req.send();
  });
};
