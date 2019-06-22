/**
 * Tests if given string has a valid url format using regex. 
 */
export default function isValidUrl(str: string) {
    var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
    '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
    const valid = !!pattern.test(str);
    try {
        // just for testing
        const _ = new URL(str);
        return valid;
    } catch(_) {
        return false;
    }
}
