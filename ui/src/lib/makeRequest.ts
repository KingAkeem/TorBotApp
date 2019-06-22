/**
 * This function provides a simple interface to perform a HTTP request.
 */
export default function (method: string, url: string, data?: string) {
    return new Promise(function (resolve, reject) {
            const xhr = new XMLHttpRequest();
            xhr.open(method, url);
            xhr.onload = function() {
                if (this.status >= 200 && this.status < 300) {
                    resolve({
                        response: xhr.response
                    });
                } else {
                    reject({
                        status: this.status,
                        statusText: xhr.statusText
                    });
                }
            };
            xhr.onerror = function() {
                reject({
                    status: this.status,
                    statusText: xhr.statusText
                });
            };
            xhr.send(JSON.stringify(data));
        });
}
