/* tslint:disable */
/* eslint-disable */
import "sst"
declare module "sst" {
  export interface Resource {
    Chimpin: {
      name: string
      type: "sst.aws.Dynamo"
    }
  }
}
export {}