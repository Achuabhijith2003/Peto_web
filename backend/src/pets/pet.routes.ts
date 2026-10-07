import { Router } from "express";
import { authenticate, optionalAuthenticate } from "../auth/auth.middleware";
import { validateUuidParams } from "../middleware/validateUuid.middleware";
import {
  createPetHandler,
  getPetHandler,
  updatePetHandler,
  deletePetHandler,
  updatePetVisibilityHandler,
  getUserPetsHandler,
  getMyPetsHandler,
  getMyPendingPetInvitesHandler,
  addPetMediaHandler,
  deletePetMediaHandler,
  invitePetParentHandler,
  respondPetParentInviteHandler,
  removePetParentHandler,
  getPetPostsHandler,
  searchTaggablePetsHandler,
  getPetMediaAccessHandler,
} from "./pet.controller";

const router = Router();

// Pet Creation & My Pets
router.post("/", authenticate, createPetHandler);
router.get("/my", authenticate, getMyPetsHandler);
router.get("/taggable", authenticate, searchTaggablePetsHandler);

// Pending Pet Parent Invitations (MUST be before /:id)
router.get("/invites/pending", authenticate, getMyPendingPetInvitesHandler);
router.post("/invites/:inviteId/respond", authenticate, validateUuidParams("inviteId"), respondPetParentInviteHandler);

// User Showcase Pets
router.get("/user/:userId", optionalAuthenticate, validateUuidParams("userId"), getUserPetsHandler);

// Individual Pet Operations (With Server-Side Visibility Enforcement)
router.get("/:id", optionalAuthenticate, validateUuidParams("id", { opaqueNotFound: true }), getPetHandler);
router.patch("/:id", authenticate, validateUuidParams("id", { opaqueNotFound: true }), updatePetHandler);
router.delete("/:id", authenticate, validateUuidParams("id", { opaqueNotFound: true }), deletePetHandler);

// Visibility Control
router.patch("/:id/visibility", authenticate, validateUuidParams("id"), updatePetVisibilityHandler);

// Pet Posts Stream
router.get("/:id/posts", optionalAuthenticate, validateUuidParams("id"), getPetPostsHandler);

// Pet Media Management & Authorized Delivery
router.get("/:id/media/:mediaId/access", optionalAuthenticate, validateUuidParams(["id", "mediaId"]), getPetMediaAccessHandler);
router.post("/:id/media", authenticate, validateUuidParams("id"), addPetMediaHandler);
router.delete("/:id/media/:mediaId", authenticate, validateUuidParams(["id", "mediaId"]), deletePetMediaHandler);

// Pet Parent Authorization & Invitations
router.post("/:id/parents/invite", authenticate, validateUuidParams("id"), invitePetParentHandler);
router.post("/:id/parents/respond", authenticate, validateUuidParams("id"), respondPetParentInviteHandler);
router.post("/:id/parents/invites/:inviteId/respond", authenticate, validateUuidParams(["id", "inviteId"]), respondPetParentInviteHandler);
router.delete("/:id/parents/:parentUserId", authenticate, validateUuidParams(["id", "parentUserId"]), removePetParentHandler);

export default router;
