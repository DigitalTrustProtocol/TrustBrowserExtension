/**
 * DTP API
 * No description provided (generated by Swagger Codegen https://github.com/swagger-api/swagger-codegen)
 *
 * OpenAPI spec version: v1
 * 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 */

import * as models from './models';
import IProfile from '../../../js/IProfile';

export interface SubjectIdentity {
    type?: string;

    meta?: IProfile;
    
    id?: string;

    path?: string;

    proof?: string;

}
