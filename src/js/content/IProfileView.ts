import ProfileController = require("../ProfileController");

export default interface IProfileView {
    render(controller: ProfileController, element: HTMLElement): void;
}
