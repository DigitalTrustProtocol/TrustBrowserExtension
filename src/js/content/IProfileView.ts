import ProfileController = require("../ProfileController");

export default interface IProfileView {
    setViewModel(controller: ProfileController): void;
    render(controller: ProfileController, element: HTMLElement): void;
}
