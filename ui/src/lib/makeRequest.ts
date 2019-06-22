/**
 * This function provides a simple interface to perform a HTTP request.
 */
export default function (method: string, url: string, data?: string): Promise<XMLHttpRequest> {
    return new Promise(function (resolve, reject) {
            const xhr = new XMLHttpRequest();
            xhr.open(method, url);
            xhr.onload = function() {
                if (this.status >= 200 && this.status < 300) {
                    resolve(xhr);
                } else {
                    reject(xhr);               
                }
            };
            xhr.onerror = () => reject(xhr)
            xhr.send(JSON.stringify(data));
        });
}
