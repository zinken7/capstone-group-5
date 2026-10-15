import { relations } from "drizzle-orm/relations";
import { region, site, siteCompanyRole, company, deployment, machineModel, technologyProduct, verificationReview, adminUser, deploymentCorrection, revision, contributor, evidence, contributionKey, resubmission, correctionKey } from "./schema.js";

export const siteRelations = relations(site, ({one, many}) => ({
	region: one(region, {
		fields: [site.regionId],
		references: [region.id]
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
	resubmissions_deploymentId: many(resubmission, {
		relationName: "resubmission_deploymentId_deployment_id"
	}),
	resubmissions_previousDeploymentId: many(resubmission, {
		relationName: "resubmission_previousDeploymentId_deployment_id"
	}),
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
		fields: [verificationReview.correctionId],
		references: [deploymentCorrection.id]
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
	correctionKeys: many(correctionKey),
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

export const resubmissionRelations = relations(resubmission, ({one}) => ({
	deployment_deploymentId: one(deployment, {
		fields: [resubmission.deploymentId],
		references: [deployment.id],
		relationName: "resubmission_deploymentId_deployment_id"
	}),
	deployment_previousDeploymentId: one(deployment, {
		fields: [resubmission.previousDeploymentId],
		references: [deployment.id],
		relationName: "resubmission_previousDeploymentId_deployment_id"
	}),
}));

export const correctionKeyRelations = relations(correctionKey, ({one}) => ({
	deploymentCorrection: one(deploymentCorrection, {
		fields: [correctionKey.correctionId],
		references: [deploymentCorrection.id]
	}),
}));