/**
 * This function provides a simple interface to perform a HTTP request.
 *
 * @param {string} method - the type of request to perform. e.g. GET, POST, PUT, etc.
 * @param {string} url - the url of the resource.
 * @param {Object} data - data to be sent as body
 */
export default function (method, url, data) {
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
