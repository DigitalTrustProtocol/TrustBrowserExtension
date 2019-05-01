/**
 * DTP API
 * DTP API (ASP.NET Core 2.0)
 *
 * OpenAPI spec version: v1
 * Contact: 
 *
 * NOTE: This class is auto generated by the swagger code generator program.
 * https://github.com/swagger-api/swagger-codegen.git
 * Do not edit the class manually.
 */

import * as models from './models';

export interface DtpCoreModelPackage {
    algorithm?: string;

    id?: string;

    root?: string;

    created?: number;

    claims?: Array<models.DtpCoreModelClaim>;

    obsoletes?: Array<models.DtpCoreModelPackageReference>;

    timestamps?: Array<models.DtpCoreModelTimestamp>;

    types?: Array<string>;

    scopes?: string;

    server?: models.DtpCoreModelServerIdentity;

    file?: string;

}
