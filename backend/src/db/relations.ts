import { relations } from "drizzle-orm/relations";
import { region, site, siteCompanyRole, company, deployment, machineModel, technologyProduct, verificationReview, adminUser, deploymentCorrection, revision, contributor, evidence, contributionKey } from "./schema.js";

export const siteRelations = relations(site, ({one, many}) => ({
	region: one(region, {
		fields: [site.countryCode],
		references: [region.countryCode]
	}),
	siteCompanyRoles: many(siteCompanyRole),
	deployments: many(deployment),
}));

export const regionRelations = relations(region, ({many}) => ({
	sites: many(site),
}));

export const siteCompanyRoleRelations = relations(siteCompanyRole, ({one}) => ({
	site: one(site, {
		fields: [siteCompanyRole.siteId],
		references: [site.id]
	}),
	company: one(company, {
		fields: [siteCompanyRole.companyId],
		references: [company.id]
	}),
}));

export const companyRelations = relations(company, ({many}) => ({
	siteCompanyRoles: many(siteCompanyRole),
	deployments: many(deployment),
	technologyProducts: many(technologyProduct),
	machineModels: many(machineModel),
}));

export const deploymentRelations = relations(deployment, ({one, many}) => ({
	site: one(site, {
		fields: [deployment.siteId],
		references: [site.id]
	}),
	machineModel: one(machineModel, {
		fields: [deployment.machineModelId],
		references: [machineModel.id]
	}),
	technologyProduct_technologyProductId: one(technologyProduct, {
		fields: [deployment.technologyProductId],
		references: [technologyProduct.id],
		relationName: "deployment_technologyProductId_technologyProduct_id"
	}),
	company: one(company, {
		fields: [deployment.technologySupplierId],
		references: [company.id]
	}),
	verificationReviews: many(verificationReview),
	revisions: many(revision),
	evidences: many(evidence),
	deploymentCorrections: many(deploymentCorrection),
	contributionKeys: many(contributionKey),
}));

export const machineModelRelations = relations(machineModel, ({one, many}) => ({
	deployments: many(deployment),
	company: one(company, {
		fields: [machineModel.manufacturerId],
		references: [company.id]
	}),
}));

export const technologyProductRelations = relations(technologyProduct, ({one, many}) => ({
	deployments_technologyProductId: many(deployment, {
		relationName: "deployment_technologyProductId_technologyProduct_id"
	}),
	company: one(company, {
		fields: [technologyProduct.supplierId],
		references: [company.id]
	}),
}));

export const verificationReviewRelations = relations(verificationReview, ({one}) => ({
	deployment: one(deployment, {
		fields: [verificationReview.deploymentId],
		references: [deployment.id]
	}),
	adminUser: one(adminUser, {
		fields: [verificationReview.adminUserId],
		references: [adminUser.id]
	}),
	deploymentCorrection: one(deploymentCorrection, {
		fields: [verificationReview.deploymentId],
		references: [deploymentCorrection.deploymentId]
	}),
}));

export const adminUserRelations = relations(adminUser, ({many}) => ({
	verificationReviews: many(verificationReview),
	revisions: many(revision),
}));

export const deploymentCorrectionRelations = relations(deploymentCorrection, ({one, many}) => ({
	verificationReviews: many(verificationReview),
	deployment: one(deployment, {
		fields: [deploymentCorrection.deploymentId],
		references: [deployment.id]
	}),
	contributor: one(contributor, {
		fields: [deploymentCorrection.contributorId],
		references: [contributor.id]
	}),
}));

export const revisionRelations = relations(revision, ({one}) => ({
	deployment: one(deployment, {
		fields: [revision.deploymentId],
		references: [deployment.id]
	}),
	contributor: one(contributor, {
		fields: [revision.contributorId],
		references: [contributor.id]
	}),
	adminUser: one(adminUser, {
		fields: [revision.adminUserId],
		references: [adminUser.id]
	}),
}));

export const contributorRelations = relations(contributor, ({many}) => ({
	revisions: many(revision),
	deploymentCorrections: many(deploymentCorrection),
}));

export const evidenceRelations = relations(evidence, ({one}) => ({
	deployment: one(deployment, {
		fields: [evidence.deploymentId],
		references: [deployment.id]
	}),
}));

export const contributionKeyRelations = relations(contributionKey, ({one}) => ({
	deployment: one(deployment, {
		fields: [contributionKey.deploymentId],
		references: [deployment.id]
	}),
}));