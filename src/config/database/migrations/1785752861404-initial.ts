import { MigrationInterface, QueryRunner } from "typeorm";

export class Initial1785752861404 implements MigrationInterface {
    name = 'Initial1785752861404'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "refresh_token" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "hashToken" character varying NOT NULL, "expiryAt" TIMESTAMP NOT NULL, "revoked" boolean NOT NULL DEFAULT false, "userId" character varying, CONSTRAINT "PK_b575dd3c21fb0831013c909e7fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_cfc7242b5b8e91e990931356c3" ON "refresh_token"  ("hashToken") `);
        await queryRunner.query(`CREATE TYPE "public"."file_type_enum" AS ENUM('profile')`);
        await queryRunner.query(`CREATE TYPE "public"."file_metatype_enum" AS ENUM('image', 'pdf')`);
        await queryRunner.query(`CREATE TABLE "file" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "fileUrl" character varying NOT NULL, "publicId" character varying NOT NULL, "type" "public"."file_type_enum" NOT NULL, "metaType" "public"."file_metatype_enum" NOT NULL, "userId" character varying, CONSTRAINT "REL_b2d8e683f020f61115edea206b" UNIQUE ("userId"), CONSTRAINT "PK_36b46d232307066b3a2c9ea3a1d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_65593ce703593144d5a8f5fddf" ON "file"  ("type") `);
        await queryRunner.query(`CREATE TABLE "authorization" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "path" character varying NOT NULL, "methods" text NOT NULL, "roleId" character varying, CONSTRAINT "PK_a8a47afd6ac0d056caccc1e9d22" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_39bc6fc1dbb66cfb2045d9f2bb" ON "authorization"  ("roleId", "path") `);
        await queryRunner.query(`CREATE TYPE "public"."role_role_enum" AS ENUM('ADMIN', 'USER')`);
        await queryRunner.query(`CREATE TABLE "role" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "role" "public"."role_role_enum" NOT NULL, CONSTRAINT "PK_b36bcfe02fc8de3c57a8b2391c2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_367aad98203bd8afaed0d70409" ON "role"  ("role") `);
        await queryRunner.query(`CREATE TYPE "public"."user_gender_enum" AS ENUM('male', 'female', 'other', 'prefer_not_to_say')`);
        await queryRunner.query(`CREATE TABLE "user" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "firstName" character varying NOT NULL, "middleName" character varying, "lastName" character varying NOT NULL, "email" character varying NOT NULL, "password" character varying NOT NULL, "roleId" character varying NOT NULL, "contactNumber" character varying, "address" character varying, "province" character varying, "district" character varying, "gender" "public"."user_gender_enum", "otpCode" character varying(6), "otpExpiryTime" TIMESTAMP, "otpAttempts" integer NOT NULL DEFAULT '0', "otpLockedUntil" TIMESTAMP, "isEmailVerified" boolean NOT NULL DEFAULT false, "isPasswordResetVerified" boolean NOT NULL DEFAULT false, "tokenVersion" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e12875dfb3b1d92d7d7c5377e2" ON "user"  ("email") `);
        await queryRunner.query(`CREATE INDEX "idx_user_role" ON "user"  ("roleId") `);
        await queryRunner.query(`CREATE TYPE "public"."plan_tier_enum" AS ENUM('FREE', 'PRO', 'ADVANCED')`);
        await queryRunner.query(`CREATE TYPE "public"."plan_billinginterval_enum" AS ENUM('MONTHLY', 'YEARLY')`);
        await queryRunner.query(`CREATE TABLE "plan" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "tier" "public"."plan_tier_enum" NOT NULL, "billingInterval" "public"."plan_billinginterval_enum", "price" numeric(10,2) NOT NULL, "name" character varying NOT NULL, CONSTRAINT "PK_54a2b686aed3b637654bf7ddbb3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_73de76c690c3fefa5e026dea22" ON "plan"  ("tier") `);
        await queryRunner.query(`CREATE TYPE "public"."subscription_status_enum" AS ENUM('PENDING', 'ACTIVE', 'EXPIRED')`);
        await queryRunner.query(`CREATE TABLE "subscription" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "userId" character varying NOT NULL, "planId" character varying NOT NULL, "status" "public"."subscription_status_enum" NOT NULL DEFAULT 'PENDING', "currentPeriodStart" TIMESTAMP WITH TIME ZONE, "currentPeriodEnd" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_8c3e00ebd02103caa1174cd5d9d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_subscription_status_period" ON "subscription"  ("status", "currentPeriodEnd") `);
        await queryRunner.query(`CREATE INDEX "idx_subscription_user" ON "subscription"  ("userId") `);
        await queryRunner.query(`CREATE TYPE "public"."invoice_status_enum" AS ENUM('OPEN', 'PAID', 'FAILED')`);
        await queryRunner.query(`CREATE TABLE "invoice" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "subscriptionId" character varying NOT NULL, "amountDue" numeric(10,2) NOT NULL, "status" "public"."invoice_status_enum" NOT NULL DEFAULT 'OPEN', "periodStart" TIMESTAMP WITH TIME ZONE, "periodEnd" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_15d25c200d9bcd8a33f698daf18" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_invoice_subscription" ON "invoice"  ("subscriptionId") `);
        await queryRunner.query(`CREATE TYPE "public"."payment_payabletype_enum" AS ENUM('INVOICE', 'ORDER', 'APPOINTMENT')`);
        await queryRunner.query(`CREATE TYPE "public"."payment_provider_enum" AS ENUM('ESEWA')`);
        await queryRunner.query(`CREATE TYPE "public"."payment_status_enum" AS ENUM('PENDING', 'COMPLETE', 'FULL_REFUND', 'PARTIAL_REFUND', 'AMBIGUOUS', 'NOT_FOUND', 'CANCELED')`);
        await queryRunner.query(`CREATE TABLE "payment" ("id" character varying NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "payableType" "public"."payment_payabletype_enum" NOT NULL, "payableId" character varying NOT NULL, "transactionUuid" character varying(100) NOT NULL, "amount" numeric(10,2) NOT NULL, "provider" "public"."payment_provider_enum" NOT NULL, "status" "public"."payment_status_enum" NOT NULL DEFAULT 'PENDING', "referenceId" character varying(100), CONSTRAINT "UQ_f5a4d9e3978cb31475f4c46dea0" UNIQUE ("transactionUuid"), CONSTRAINT "PK_fcaec7df5adf9cac408c686b2ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_payment_payable" ON "payment"  ("payableType", "payableId") `);
        await queryRunner.query(`CREATE INDEX "idx_payment_transactionUuid" ON "payment"  ("transactionUuid") `);
        await queryRunner.query(`ALTER TABLE "refresh_token" ADD CONSTRAINT "FK_8e913e288156c133999341156ad" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "file" ADD CONSTRAINT "FK_b2d8e683f020f61115edea206b3" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "authorization" ADD CONSTRAINT "FK_da7914c44f44c939f586d743e83" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user" ADD CONSTRAINT "FK_c28e52f758e7bbc53828db92194" FOREIGN KEY ("roleId") REFERENCES "role"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "subscription" ADD CONSTRAINT "FK_cc906b4bc892b048f1b654d2aa0" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "subscription" ADD CONSTRAINT "FK_6b6d0e4dc88105a4a11103dd2cd" FOREIGN KEY ("planId") REFERENCES "plan"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "invoice" ADD CONSTRAINT "FK_1ca5dce89a3293e6b88cd14c0ca" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "invoice" DROP CONSTRAINT "FK_1ca5dce89a3293e6b88cd14c0ca"`);
        await queryRunner.query(`ALTER TABLE "subscription" DROP CONSTRAINT "FK_6b6d0e4dc88105a4a11103dd2cd"`);
        await queryRunner.query(`ALTER TABLE "subscription" DROP CONSTRAINT "FK_cc906b4bc892b048f1b654d2aa0"`);
        await queryRunner.query(`ALTER TABLE "user" DROP CONSTRAINT "FK_c28e52f758e7bbc53828db92194"`);
        await queryRunner.query(`ALTER TABLE "authorization" DROP CONSTRAINT "FK_da7914c44f44c939f586d743e83"`);
        await queryRunner.query(`ALTER TABLE "file" DROP CONSTRAINT "FK_b2d8e683f020f61115edea206b3"`);
        await queryRunner.query(`ALTER TABLE "refresh_token" DROP CONSTRAINT "FK_8e913e288156c133999341156ad"`);
        await queryRunner.query(`DROP INDEX "public"."idx_payment_transactionUuid"`);
        await queryRunner.query(`DROP INDEX "public"."idx_payment_payable"`);
        await queryRunner.query(`DROP TABLE "payment"`);
        await queryRunner.query(`DROP TYPE "public"."payment_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."payment_provider_enum"`);
        await queryRunner.query(`DROP TYPE "public"."payment_payabletype_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_invoice_subscription"`);
        await queryRunner.query(`DROP TABLE "invoice"`);
        await queryRunner.query(`DROP TYPE "public"."invoice_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_subscription_user"`);
        await queryRunner.query(`DROP INDEX "public"."idx_subscription_status_period"`);
        await queryRunner.query(`DROP TABLE "subscription"`);
        await queryRunner.query(`DROP TYPE "public"."subscription_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_73de76c690c3fefa5e026dea22"`);
        await queryRunner.query(`DROP TABLE "plan"`);
        await queryRunner.query(`DROP TYPE "public"."plan_billinginterval_enum"`);
        await queryRunner.query(`DROP TYPE "public"."plan_tier_enum"`);
        await queryRunner.query(`DROP INDEX "public"."idx_user_role"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e12875dfb3b1d92d7d7c5377e2"`);
        await queryRunner.query(`DROP TABLE "user"`);
        await queryRunner.query(`DROP TYPE "public"."user_gender_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_367aad98203bd8afaed0d70409"`);
        await queryRunner.query(`DROP TABLE "role"`);
        await queryRunner.query(`DROP TYPE "public"."role_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_39bc6fc1dbb66cfb2045d9f2bb"`);
        await queryRunner.query(`DROP TABLE "authorization"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_65593ce703593144d5a8f5fddf"`);
        await queryRunner.query(`DROP TABLE "file"`);
        await queryRunner.query(`DROP TYPE "public"."file_metatype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."file_type_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cfc7242b5b8e91e990931356c3"`);
        await queryRunner.query(`DROP TABLE "refresh_token"`);
    }

}
