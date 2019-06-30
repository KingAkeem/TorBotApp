import tr from 'tor-request';

const makeTorRequest = (url: string): Promise<any> => {
    return new Promise((accept, reject) => {
        tr.request(url, (error: any, response: any, _) => {
            if (error) reject(error);
            accept(response);
        });
    });
}

export default makeTorRequest;