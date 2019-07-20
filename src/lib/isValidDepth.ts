const MAX_DEPTH = 10; 
export default (depth: number): boolean => {
    if (depth > MAX_DEPTH) {
        return false;
    }
    return true;
};