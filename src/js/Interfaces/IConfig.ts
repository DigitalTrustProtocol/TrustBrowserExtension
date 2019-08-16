import { MessageHandler } from "../Shared/MessageHandler";
import { TrustGraphPopupClient } from "../Shared/TrustGraphPopupClient";

import DTPService = require("../DTPService");
import TrustStrategy = require("../TrustStrategy");
import PackageBuilder = require("../PackageBuilder");
import SubjectService = require("../SubjectService");
import ISettings from "./Settings.interface";
import ProfileRepository = require("../ProfileRepository");


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

