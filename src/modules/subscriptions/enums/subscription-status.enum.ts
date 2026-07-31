export enum SubscriptionStatus {
    PENDING = 'PENDING',   // created, waiting for payment to confirm
    ACTIVE = 'ACTIVE',     // paid, currently within its period
    EXPIRED = 'EXPIRED',   // period ended naturally — no cancellation path exists
}