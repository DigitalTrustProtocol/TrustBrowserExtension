export default class AjaxErrorParser {
    public static formatErrorMessage(jqXHR : JQueryXHR, exception: string) : string {
        if (jqXHR.status === 0) {
            return ('Not connected.\nPlease verify your network connection or the server may be down.');
        } else if (jqXHR.status == 404) {
            return ('The requested page not found. [404]');
        } else if (jqXHR.status == 500) {
            return ('Internal Server Error [500].');
        } else if (exception === 'parsererror') {
            return ('Requested JSON parse failed.');
        } else if (exception === 'timeout') {
            return ('Time out error.');
        } else if (exception === 'abort') {
            return ('Ajax request aborted.');
        } else {
            return ('Uncaught Error.\n' + jqXHR.responseText);
        }
    }
}
