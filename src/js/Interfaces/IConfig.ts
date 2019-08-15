import { MessageHandler } from "../Shared/MessageHandler";
import { StorageClient } from "../Shared/StorageClient";
import { TrustGraphPopupClient } from "../Shared/TrustGraphPopupClient";
import ISettings from "Settings.interface";
import DTPService = require("../DTPService");
import TrustStrategy = require("../TrustStrategy");
import PackageBuilder = require("../PackageBuilder");
import SubjectService = require("../SubjectService");


export default interface IConfig {
    settings: ISettings,
    profileRepository: ProfileRepository,
    packageBuilder: PackageBuilder,
    subjectService: SubjectService,
    dtpService: DTPService,
    trustStrategy: TrustStrategy,
    trustGraphPopupClient: TrustGraphPopupClient,
    messageHandler: MessageHandler
}
