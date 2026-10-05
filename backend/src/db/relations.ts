import { relations } from "drizzle-orm/relations";
import { region, site, siteCompanyRole, company, technologyProduct, deployment, machineModel, verificationReview, adminUser, revision, contributor, evidence } from "./schema.js";

export const siteRelations = relations(site, ({one, many}) => ({
	region: one(region, {
		fields: [site.countryCode],
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
	technologyProducts: many(technologyProduct),
	machineModels: many(machineModel),
}));

export const technologyProductRelations = relations(technologyProduct, ({one, many}) => ({
	company: one(company, {
		fields: [technologyProduct.supplierId],
		references: [company.id]
	}),
	deployments: many(deployment),
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
	technologyProduct: one(technologyProduct, {
		fields: [deployment.technologyProductId],
		references: [technologyProduct.id]
	}),
	verificationReviews: many(verificationReview),
	revisions: many(revision),
	evidences: many(evidence),
}));

export const machineModelRelations = relations(machineModel, ({one, many}) => ({
	deployments: many(deployment),
	company: one(company, {
		fields: [machineModel.manufacturerId],
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
}));

export const adminUserRelations = relations(adminUser, ({many}) => ({
	verificationReviews: many(verificationReview),
	revisions: many(revision),
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
}));

export const evidenceRelations = relations(evidence, ({one}) => ({
	deployment: one(deployment, {
		fields: [evidence.deploymentId],
		references: [deployment.id]
	}),
}));