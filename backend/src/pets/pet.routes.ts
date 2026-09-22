import { Router } from "express";
import { authenticate, optionalAuthenticate } from "../auth/auth.middleware";
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
} from "./pet.controller";

const router = Router();

// Pet Creation & My Pets
router.post("/", authenticate, createPetHandler);
router.get("/my", authenticate, getMyPetsHandler);

// Pending Pet Parent Invitations (MUST be before /:id)
router.get("/invites/pending", authenticate, getMyPendingPetInvitesHandler);
router.post("/invites/:inviteId/respond", authenticate, respondPetParentInviteHandler);

// User Showcase Pets
router.get("/user/:userId", optionalAuthenticate, getUserPetsHandler);

// Individual Pet Operations (With Server-Side Visibility Enforcement)
router.get("/:id", optionalAuthenticate, getPetHandler);
router.patch("/:id", authenticate, updatePetHandler);
router.delete("/:id", authenticate, deletePetHandler);

// Visibility Control
router.patch("/:id/visibility", authenticate, updatePetVisibilityHandler);

// Pet Posts Stream
router.get("/:id/posts", optionalAuthenticate, getPetPostsHandler);

// Pet Media Management
router.post("/:id/media", authenticate, addPetMediaHandler);
router.delete("/:id/media/:mediaId", authenticate, deletePetMediaHandler);

// Pet Parent Authorization & Invitations
router.post("/:id/parents/invite", authenticate, invitePetParentHandler);
router.post("/:id/parents/respond", authenticate, respondPetParentInviteHandler);
router.post("/:id/parents/invites/:inviteId/respond", authenticate, respondPetParentInviteHandler);
router.delete("/:id/parents/:parentUserId", authenticate, removePetParentHandler);

export default router;
