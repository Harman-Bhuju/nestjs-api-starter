import { Injectable } from "@nestjs/common";
import { EsewaService } from "../providers/esewa.service";
import { PaymentProvider } from "../enums/payment-provider.enum";
import { PaymentGateway } from "../interfaces/payment.interface";

@Injectable()
export class PaymentFactory {

    constructor(
        private readonly esewaService: EsewaService,
        // private readonly khaltiService: KhaltiService
    ) { }

    create(provider: PaymentProvider): PaymentGateway {

        switch (provider) {

            case PaymentProvider.ESEWA:
                return this.esewaService;

            default:
                throw new Error('Unsupported payment provider')
        }

    }
}