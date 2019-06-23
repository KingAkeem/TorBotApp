/**
 * This function provides a simple interface to perform a HTTP request.
 */
export default function (method: string, url: string, data?: string): Promise<OriginRequest> {
    return new Promise(function (resolve, reject) {
            const xhr = new XMLHttpRequest();
            xhr.open(method, url);
            xhr.onload = function() {
                if (this.status >= 200 && this.status < 300) {
                    const ajax = Object.assign(xhr, {origin: url});
                    resolve(ajax);
                } else { 
                    const ajax = Object.assign(xhr, {origin: url});
                    reject(ajax);               
                }
            };
            xhr.onerror = () => reject(xhr)
            if (data) xhr.send(JSON.stringify(data));
            else xhr.send();
        });
}
