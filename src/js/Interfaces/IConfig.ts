import { MessageHandler } from "../Shared/MessageHandler";
import { TrustGraphPopupClient } from "../Shared/TrustGraphPopupClient";

import DTPService from "../DTPService";
import TrustStrategy from "../TrustStrategy";
import PackageBuilder from "../PackageBuilder";
import SubjectService from "../SubjectService";
import ISettings from "./Settings.interface";
import ProfileRepository from "../ProfileRepository";


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

