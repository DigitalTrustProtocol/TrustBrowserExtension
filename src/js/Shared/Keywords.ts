// import 'select2';

// interface selectOption {
//     id: number;
//     text: string;
// }

export class KeywordsProvider {

    public static data: Array<any> = [
        {
            id: -1,
            text: 'Bad'
        },
        {
            id: -2,
            text: 'Fake news'
        },
        {
            id: -3,
            text: 'Invalid content'
        },
        {
            id: -4,
            text: 'Faktually wrong'
        },
        {
            id: 1,
            text: 'Good'
        },
        {
            id: 2,
            text: 'Real news'
        },
        {
            id: 3,
            text: 'Valid content'
        },
        {
            id: 4,
            text: 'Faktually correct'
        },
        {
            id: 10000,
            text: 'Neutral'
        }

    ];


    public static getKeywords() : Array<any> {
        return KeywordsProvider.data;
    }
}
