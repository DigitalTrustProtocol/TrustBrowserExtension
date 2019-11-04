import { ProfileModal } from '../Model/ProfileModal';
import ProfileRepository from '../ProfileRepository';
import DTPService from '../DTPService';

export default interface IGraphController {
    profileRepository: ProfileRepository;
    dtpService: DTPService;

    init() : Promise<void>;
    onSelect(pv: ProfileModal): void;
}

