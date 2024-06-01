/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    Api: {
      managementEndpoint: string
      type: "sst.aws.ApiGatewayWebSocket"
      url: string
    }
    Chimpin: {
      name: string
      type: "sst.aws.Dynamo"
    }
    Site: {
      type: "sst.aws.Nextjs"
      url: string
    }
  }
}
export {}