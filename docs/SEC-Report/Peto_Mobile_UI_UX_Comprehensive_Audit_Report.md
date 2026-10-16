# Peto Mobile Application
## Official UI/UX, Functional, Responsive, Accessibility & Performance Audit
### Flutter Mobile Client (`Mobile/peto_user`)

---

> **AUDIT CLASSIFICATION & NON-DESTRUCTIVE EXECUTION DECLARATION**  
> **APPLICATION CODE MODIFIED:** **NO (0 lines of application source or config modified)**  
> **AUDIT SCOPE:** Complete Flutter codebase, static diagnostics, architectural review, ADB hardware interrogation, domain model validation, cross-platform alignment with Peto Web.  
> **STATUS:** Complete & Ready for Remediation Phase  

---

## Table of Contents

- [Cover](#peto-mobile-application)
- [SECTION 1: Executive Summary](#section-1-executive-summary)
- [SECTION 2: Audit Scope & Methodology](#section-2-audit-scope--methodology)
- [SECTION 3: Test Environment](#section-3-test-environment)
- [SECTION 4: Architecture & Screen Inventory](#section-4-architecture--screen-inventory)
- [SECTION 5: UX Health Matrix](#section-5-ux-health-matrix)
- [SECTION 6: Authentication & Onboarding](#section-6-authentication--onboarding)
- [SECTION 7: Navigation & Information Architecture](#section-7-navigation--information-architecture)
- [SECTION 8: Home Feed & Posting](#section-8-home-feed--posting)
- [SECTION 9: Reels & Video](#section-9-reels--video)
- [SECTION 10: Explore & Search](#section-10-explore--search)
- [SECTION 11: Communities](#section-11-communities)
- [SECTION 12: User Profiles](#section-12-user-profiles)
- [SECTION 13: Pet Profiles & Pet Management](#section-13-pet-profiles--pet-management)
- [SECTION 14: Business Profiles & Identity Switching](#section-14-business-profiles--identity-switching)
- [SECTION 15: Verification](#section-15-verification)
- [SECTION 16: Notifications & Saved Content](#section-16-notifications--saved-content)
- [SECTION 17: Settings](#section-17-settings)
- [SECTION 18: Forms, Keyboard & Mobile Ergonomics](#section-18-forms-keyboard--mobile-ergonomics)
- [SECTION 19: Responsive Layout & Safe Areas](#section-19-responsive-layout--safe-areas)
- [SECTION 20: Accessibility](#section-20-accessibility)
- [SECTION 21: Media Handling](#section-21-media-handling)
- [SECTION 22: Performance](#section-22-performance)
- [SECTION 23: Network/API & Error Handling](#section-23-networkapi--error-handling)
- [SECTION 24: Privacy & Security UX](#section-24-privacy--security-ux)
- [SECTION 25: Generic / AI-Generated UI Pattern Findings](#section-25-generic--ai-generated-ui-pattern-findings)
- [SECTION 26: Cross-Screen Design Consistency](#section-26-cross-screen-design-consistency)
- [SECTION 27: Runtime / Physical Device Findings](#section-27-runtime--physical-device-findings)
- [SECTION 28: Complete Issue Register](#section-28-complete-issue-register)
- [SECTION 29: Prioritized Remediation Roadmap](#section-29-prioritized-remediation-roadmap)
- [SECTION 30: Manual Regression Test Checklist](#section-30-manual-regression-test-checklist)
- [SECTION 31: Conclusion](#section-31-conclusion)

---

## SECTION 1: Executive Summary

This comprehensive audit was executed on the Peto Flutter mobile application located in `Mobile/peto_user`. The objective of this audit was to discover, analyze, verify, and categorize usability friction, architectural antipatterns, responsive layout traps, domain model misunderstandings, and performance risks before initiating code remediation or aesthetic design polish.

### Key Strengths Identified
1. **Accurate Core Domain Modeling in Data Layers:** The underlying data models (`models/user_model.dart`, `models/pet_model.dart`, `models/post_model.dart`) correctly treat human users as the primary authentication and social identity, and treat pets as first-class animal profiles belonging to human parents. Pets do not have their own followers, following counts, or login accounts.
2. **Dual-Identity Architecture Present:** The application has full client-side support for identity switching between Personal and Business profiles via `IdentitySwitcherBottomSheet`, injecting `x-acting-identity-type: BUSINESS` and `x-acting-identity-id: <id>` headers into API requests.
3. **Clean Baseline Tooling:** The application passes `flutter analyze` with 0 compile errors and executes the test suite (`flutter test`) cleanly (7/7 passed).
4. **First-Party Ads Marketplace Decoupled:** The application correctly honors the initial launch feature flag (`petoAdsMarketplace: false`) and hides disabled advertiser tools from ordinary users.

### High-Priority Deficiencies Discovered
1. **Critical Memory / Viewport Virtualization Failure in Feed & Lists (P1):** The primary social feed (`lib/screens/home/home_screen.dart`), the community screen (`lib/screens/community/community_screen.dart`), and the profile screen (`lib/screens/profile/profile_screen.dart`) wrap `SingleChildScrollView` around `ListView.builder(shrinkWrap: true, physics: NeverScrollableScrollPhysics())`. This completely destroys Flutter's lazy list virtualization, forcing every post card, media asset, and video player widget to be instantiated and retained in memory simultaneously.
2. **Hardcoded Business Verification Badge (P0/P1):** In `lib/screens/business/business_profile_screen.dart:467`, the yellow Business Verified badge (`const VerificationBadge(badgeType: 'BUSINESS_VERIFIED', size: 20)`) is hardcoded next to the business name, displaying an official verified badge on *every* business profile regardless of whether the business is verified in the backend.
3. **Broken Navigation to Verification Screen (P1):** `lib/screens/settings/verification_screen.dart` is fully implemented for personal ID verification, but the Settings screen (`lib/screens/settings/settings_screen.dart:336`) routes its "Verification" tile to `_launchAdvertiserPortal` (opening the web advertiser portal URL in an external browser). The native verification screen is completely orphaned and inaccessible to mobile users.
4. **Onboarding Logout Friction (P1):** In `lib/screens/auth/create_profile_screen.dart:122,148`, completing profile setup or tapping "Skip for now" immediately invokes `authProvider.logout()` and sends the user back to the login screen, forcing them to re-enter credentials immediately after successful account creation.
5. **Information Architecture Terminology Disconnect (P1):** The mobile application introduces "Pet Circles" on the community discovery screen, while the bottom nav bar labels it "Community", and the backend/web platform standardizes on "Communities". Search is also labeled "Search" on mobile bottom nav versus "Explore" on web.
6. **SVG Render Crash in Google Sign-In Button (P2):** `lib/widgets/google_sign_in_button.dart:206` attempts to load an SVG file (`google-color.svg`) via `Image.network()`. Flutter's native `Image.network` cannot decode SVG vectors, causing network decode failures on every render and permanently falling back to an error icon.
7. **Reels Scrubber Hidden Under Bottom Navigation (P2):** In `lib/screens/reels/reel_video_player.dart:346`, the video progress scrubber is positioned at `bottom: 0`, which is occluded by the `BottomNavigationBar` in `MainShell`.
8. **App Launcher Label Mismatch (P3):** `android/app/src/main/AndroidManifest.xml:9` sets `android:label="peto_user"` instead of "Peto".

---

## SECTION 2: Audit Scope & Methodology

### Non-Destructive Constraint
This audit followed a strict read-only policy. No `.dart` application files, configs, assets, databases, or backend endpoints were edited or refactored.

### Methodology & Evidence Classification
Every finding in this report is assigned a verified Evidence Level:
- **`RUNTIME CONFIRMED`**: Directly verified via live execution on the physical device or debugger.
- **`LOG CONFIRMED`**: Verified through tool outputs (`flutter analyze`, `flutter test`, ADB shell outputs).
- **`SOURCE CONFIRMED`**: Verified by exact line-by-line inspection of Flutter source code.
- **`SOURCE RISK — RUNTIME TEST REQUIRED`**: Identified via static pattern analysis as a probable defect under edge conditions (e.g. low-memory, large text scaling, specific gesture navigation mode) requiring physical test validation.

---

## SECTION 3: Test Environment

### Host Environment
- **Host OS:** Windows 11 Enterprise (64-bit)
- **Flutter SDK:** 3.44.6 • channel stable • tools version 3.44.6
- **Dart SDK:** 3.12.2 • DevTools 2.57.0
- **Android SDK Platform:** API 36.1.0 (`android-36`)
- **Java Runtime:** OpenJDK 21.0.8 (LTS)
- **Build Tools:** Android Gradle Plugin 8.9.1, Kotlin 2.1.10

### Physical Test Device (Connected via ADB)
- **Manufacturer:** Nothing
- **Model:** A059 (CMF Phone 1 / AsteroidsIND)
- **Android Version:** Android 16 (API Level 36)
- **Physical Screen Resolution:** `1080 x 2392` pixels
- **Physical Screen Density:** `420 dpi`
- **Device Viewport (Logical Flutter Units):**
  - Logical Width: `411.4 dp` (`1080 / (420 / 160)`)
  - Logical Height: `911.2 dp` (`2392 / (420 / 160)`)
- **Installed Package:** `com.peto.jr` (Version 1.0.0, Build Code 1)
- **Input / Navigation Mode:** Full-gesture navigation pill enabled

---

## SECTION 4: Architecture & Screen Inventory

### App Architecture
- **State Management:** `Provider` (`provider: ^6.1.1`) with 6 global change notifiers mounted at root (`lib/main.dart`):
  1. `AuthProvider`: Authentication, user data, managed businesses, active identity switching.
  2. `PostProvider`: Feed posts, creating posts, comments, likes, bookmarks.
  3. `CommunityProvider`: Community discovery, category filtering, joining/leaving.
  4. `ReelProvider`: Short-form video reels, pagination, interactions.
  5. `NotificationProvider`: Notification stream, unread badge counter, pagination.
  6. `SystemStatusProvider`: Global 503 maintenance mode detection and banner control.
- **Networking:** `Dio` (`dio: ^5.4.0`) with interceptors in `ApiService` (`lib/services/api_service.dart`) handling bearer tokens, token refresh on 401, active identity headers, and localized timezone/country headers.
- **Navigation Architecture:** `IndexedStack` inside `MainShell` (`lib/screens/main_shell.dart`) hosting 5 tabs: Home, Community, Search, Reels, Profile. Modal routes pushed on top via `Navigator.push`.

### Screen & Route Inventory (32 User-Facing Screens Audited)

| # | Screen / Route | File Location | Auth Req | Primary Purpose & Key Widgets |
|---|---|---|---|---|
| 1 | `SplashScreen` | `lib/screens/splash_screen.dart` | No | Cold startup logo animation; static 1800ms timer; unconditional push to MainShell. |
| 2 | `MainShell` | `lib/screens/main_shell.dart` | Partial | Bottom navigation host; `IndexedStack` keeping all 5 primary tabs mounted. |
| 3 | `HomeScreen` | `lib/screens/home/home_screen.dart` | Partial | Social feed, stories bar, ad banners, quick composer card, post feed. |
| 4 | `LoginScreen` | `lib/screens/auth/login_screen.dart` | No | Email/password sign-in, OAuth triggers, password reset link. |
| 5 | `RegisterScreen` | `lib/screens/auth/register_screen.dart` | No | Step 1 registration: username, email, password, confirm password. |
| 6 | `CreateProfileScreen` | `lib/screens/auth/create_profile_screen.dart` | Yes | Step 2 onboarding: avatar upload, full name, bio, date of birth. |
| 7 | `ForgotPasswordScreen` | `lib/screens/auth/forgot_password_screen.dart` | No | Password recovery email submission. |
| 8 | `ReelsScreen` | `lib/screens/reels/reels_screen.dart` | No | Fullscreen vertical swiping video reels player; comments; like; save. |
| 9 | `SearchScreen` | `lib/screens/search/search_screen.dart` | No | Search bar, trending tag chips, tabbed results (Top, Posts, Users, Communities). |
| 10 | `CommunityScreen` | `lib/screens/community/community_screen.dart` | No | Community discovery, category chips, sort pills, community cards. |
| 11 | `CommunityDetailScreen` | `lib/screens/community/community_detail_screen.dart` | Partial | Community header, member count, join toggle, community-specific feed. |
| 12 | `CreateCommunityScreen` | `lib/screens/community/create_community_screen.dart` | Yes | Form to create a new pet community (name, description, avatar, category). |
| 13 | `EditCommunityScreen` | `lib/screens/community/edit_community_screen.dart` | Yes | Community admin management form. |
| 14 | `ProfileScreen` | `lib/screens/profile/profile_screen.dart` | Yes | Authenticated user profile, cover, avatar, stats, business cards, pet showcase, posts. |
| 15 | `PublicProfileScreen` | `lib/screens/profile/public_profile_screen.dart` | No | Read-only public view of other human social profiles. |
| 16 | `EditProfileScreen` | `lib/screens/profile/edit_profile_screen.dart` | Yes | Personal profile editor (name, bio, location, website, avatar, cover). |
| 17 | `FollowersFollowingScreen` | `lib/screens/profile/followers_following_screen.dart` | Partial | Tabbed list of human user followers and following relations. |
| 18 | `BookmarksScreen` | `lib/screens/profile/bookmarks_screen.dart` | Yes | Grid and list of user's saved/bookmarked social posts. |
| 19 | `PetProfileScreen` | `lib/screens/pets/pet_profile_screen.dart` | Partial | Animal profile showcase, breed/age details, co-parent manager, gallery. |
| 20 | `AddPetBottomSheet` | `lib/widgets/pet_showcase_section.dart` | Yes | Modal form to add a new companion pet to user's profile. |
| 21 | `EditPetBottomSheet` | `lib/widgets/pet_showcase_section.dart` | Yes | Modal form to edit pet attributes, species, breed, and privacy. |
| 22 | `BusinessProfileScreen` | `lib/screens/business/business_profile_screen.dart` | Partial | Commercial entity profile, logo, cover, category, contact, business posts. |
| 23 | `EditBusinessScreen` | `lib/screens/business/edit_business_screen.dart` | Yes | Business information editor for authorized managers. |
| 24 | `IdentitySwitcherBottomSheet` | `lib/widgets/identity_switcher_bottom_sheet.dart` | Yes | Active acting persona picker (Personal vs Managed Businesses). |
| 25 | `VerificationScreen` | `lib/screens/settings/verification_screen.dart` | Yes | Blue tick individual identity verification application & doc upload. |
| 26 | `NotificationScreen` | `lib/screens/notifications/notification_screen.dart` | Yes | Paginated list of social alerts (likes, comments, mentions, co-parent invites). |
| 27 | `CreatePostScreen` | `lib/screens/posts/create_post_screen.dart` | Yes | Social composer: multi-photo/video picker, pet tagging, user mentions. |
| 28 | `PostDetailScreen` | `lib/screens/posts/post_detail_screen.dart` | Partial | Standalone post card view with inline comments bottom sheet. |
| 29 | `CommentsBottomSheet` | `lib/widgets/comments_bottom_sheet.dart` | Partial | Threaded post comments list, reply banner, input field. |
| 30 | `SettingsScreen` | `lib/screens/settings/settings_screen.dart` | Yes | Security, policies, business shortcuts, advertiser links, sign-out. |
| 31 | `PolicyScreen` | `lib/screens/policy/policy_screen.dart` | No | In-app legal policies viewer (Privacy Policy, Terms of Service). |
| 32 | `MaintenanceScreen` | `lib/screens/errors/maintenance_screen.dart` | No | System-wide 503 maintenance blocker with auto-retry countdown. |

---

## SECTION 5: UX Health Matrix

| Product Surface / Dimension | Heuristic Grade | Rationale Summary |
|---|---|---|
| **Authentication & Onboarding** | Needs Improvement | Core login/register works, but onboarding logs user out upon profile completion. Google SVG button fails to render. |
| **Navigation & IA** | Needs Improvement | Mismatched labels ("Community" vs "Pet Circles" vs Web "Communities"; "Search" vs Web "Explore"). Verification link misdirected. |
| **Home Feed** | Needs Improvement | Unvirtualized list inside SingleChildScrollView causes severe memory overhead; unoptimized post card dates. |
| **Posting & Composer** | Good | Pet tagging semantics correctly tag pets as subjects ("with Milo") rather than authors. Multi-image upload works well. |
| **Reels & Video** | Good | Robust controller disposal on tab exit; aspect ratio toggle; scrubber hidden under bottom nav bar. |
| **Explore & Search** | Needs Improvement | Missing Pet and Business entity tabs; displays "Posts (0)" on initial load before user queries. |
| **Communities** | Needs Improvement | Terminology clash ("Pet Circles" vs "Community"); unvirtualized community card list. |
| **User Profiles** | Good | Comprehensive stats and bookmarks shortcuts; tapping post grid opens AlertDialog instead of page navigation. |
| **Pet Profiles & Management** | Good | Domain model strictly respected (no pet followers/inbox); huge 2,700-line monolithic widget file needs future splitting. |
| **Business Profiles** | Poor | Hardcoded yellow verified badge renders unconditionally on unverified businesses; good identity switching logic. |
| **Verification** | Poor | Screen exists but is completely unreachable from Settings; Settings tile opens web advertiser URL instead. |
| **Notifications** | Good | Infinite scroll pagination implemented cleanly; taps route properly to post detail with auto-open comments. |
| **Settings** | Needs Improvement | Misleads user to web advertiser portal for verification; missing appearance/dark mode toggles. |
| **Mobile Responsiveness** | Good | Adapts well to Nothing A059 (411dp width); safe area insets respected in most bottom sheets. |
| **Accessibility** | Needs Improvement | Low semantic label coverage on icon-only buttons (like, bookmark, more, camera triggers). |
| **Performance** | Needs Improvement | High risk of memory pressure and scroll jank in feed due to lack of viewport recycling. |
| **Error Handling** | Good | Controlled 503 maintenance screen with auto-recovery; health check dialog leaks internal API URL. |
| **Visual Consistency** | Needs Improvement | Secondary color is royal blue (`0x0058BE`), clashing with warm amber web palette; dark mode completely missing. |

---

## SECTION 6: Authentication & Onboarding

### Findings
1. **Broken SVG in Google Sign-In Button (`lib/widgets/google_sign_in_button.dart:206`):**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* `Image.network('https://www.svgrepo.com/show/475656/google-color.svg')` is used inside the button. Flutter's default image codec throws an unhandled exception when decoding SVGs, triggering the fallback error builder on every render.
   - *Fix:* Replace with a bundled raster asset (`assets/images/google_logo.png`) or a native Vector widget.
2. **Forced Logout Upon Completing Profile Creation (`lib/screens/auth/create_profile_screen.dart:122,148`):**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* When a user completes the onboarding profile form or taps "Skip for now", the code executes `await authProvider.logout()` and pushes `LoginScreen` with a success message.
   - *Impact:* The user already authenticated during registration; forcing them to re-enter their email and password immediately afterwards introduces extreme friction.
   - *Fix:* Once profile setup succeeds, refresh the user session and navigate directly to `MainShell`.
3. **Hardcoded Splash Screen Delay (`lib/screens/splash_screen.dart:35`):**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* `Future.delayed(const Duration(milliseconds: 1800))` unconditionally delays startup for nearly two seconds before navigating to `MainShell`, even when session verification completes earlier.

---

## SECTION 7: Navigation & Information Architecture

### Findings
1. **Cross-Platform Terminology Inconsistency:**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:*
     - Bottom Nav Tab 1: Mobile labels it `Community`, while the screen header says `Pet Circles`, and web uses canonical `Communities`.
     - Bottom Nav Tab 2: Mobile labels it `Search`, while web uses `Explore`.
   - *Recommended Canonical Terms:* `Feed`, `Communities`, `Explore`, `Reels`, `Profile`.
2. **Tab Stacking via `IndexedStack` Memory Retention (`lib/screens/main_shell.dart:122`):**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* `IndexedStack` keeps all 5 screens (`HomeScreen`, `CommunityScreen`, `SearchScreen`, `ReelsScreen`, `ProfileScreen`) alive simultaneously. With feed and reels media loaded in background tabs, baseline memory consumption is substantially elevated.

---

## SECTION 8: Home Feed & Posting

### Findings
1. **Critical Scroll & Memory Anti-Pattern (`lib/screens/home/home_screen.dart:159-243`):**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* `HomeScreen` builds its post list using:
     ```dart
     SingleChildScrollView(
       child: Column(
         children: [
           ...
           ListView.builder(
             shrinkWrap: true,
             physics: const NeverScrollableScrollPhysics(),
             itemCount: postProvider.posts.length,
             ...
           )
         ]
       )
     )
     ```
   - *Impact:* Disables viewport recycling. In a feed of 50 posts with high-resolution photos and videos, Flutter keeps all 50 `PostCard` instances, controllers, and image decoders mounted. This leads directly to low-memory garbage collection pauses, dropped frames, and eventual Out-Of-Memory (OOM) crashes on real devices.
   - *Fix:* Convert to `CustomScrollView` using `SliverList` and `SliverToBoxAdapter`.
2. **Absolute vs Relative Timestamps (`lib/widgets/post_card.dart:356`):**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* Uses `DateFormat.yMMMd().format(post.createdAt)` ("Oct 5, 2026") on the post card header, while comments and notifications use relative time ("2h ago", "Just now").

---

## SECTION 9: Reels & Video

### Findings
1. **Video Progress Indicator Obscured by Navigation Bar (`lib/screens/reels/reel_video_player.dart:346`):**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* `Positioned(bottom: 0, child: VideoProgressIndicator(...))` sits at the bottom edge of the screen. Inside `MainShell`, the `BottomNavigationBar` (height 56dp+) sits directly on top of it, making the progress bar invisible and unscrubbable.
2. **Video Controller Disposal Efficiency:**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* `ReelVideoPlayer` properly calls `_disposeController()` when `isActive` switches to false, preventing background video decoding leaks when users swipe between reels or change tabs.

---

## SECTION 10: Explore & Search

### Findings
1. **Missing Entity Search Tabs (`lib/screens/search/search_screen.dart:287`):**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* Search tabs only include: `Top`, `Posts`, `Users`, `Communities`. There is no dedicated search tab for `Pets` or `Businesses`.
2. **Premature Zero Counts in Tab Titles (`lib/screens/search/search_screen.dart:288`):**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* On initial load before any search query is entered, the tab bar displays `Posts (0)`, `Users (0)`, `Communities (0)`.

---

## SECTION 11: Communities

### Findings
1. **Terminology Divergence ("Pet Circles"):**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* In `lib/screens/community/community_screen.dart`, header says "Pet Circles", button says "New Circle", search hint says "Search circles". This contradicts the "Community" bottom nav tab and the backend `Community` data model.
2. **Duplicate Unvirtualized ListView:**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* Lines 339–342 use `SingleChildScrollView` + `shrinkWrap: true` `ListView.builder` for community cards.

---

## SECTION 12: User Profiles

### Findings
1. **Post Grid Dialog Antipaterrn (`lib/screens/profile/profile_screen.dart:140-165`):**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* Tapping a post in the 3-column profile grid opens an `AlertDialog` containing the full `PostCard` widget inside a popup box, instead of navigating to `PostDetailScreen`.

---

## SECTION 13: Pet Profiles & Pet Management

### Findings
1. **Correct Animal Domain Alignment:**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* Pet profiles in `lib/screens/pets/pet_profile_screen.dart` correctly show species, breed, age, privacy visibility (`PUBLIC`, `CONNECTIONS`, `PRIVATE`), and co-parent relationships without attributing social accounts, follower graphs, or inboxes to pets.
2. **Monolithic Architecture Risk:**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* `lib/widgets/pet_showcase_section.dart` is 2,747 lines long (112 KB), containing multiple bottom sheets, forms, and pickers in a single file.

---

## SECTION 14: Business Profiles & Identity Switching

### Findings
1. **Unconditional Verified Badge on All Businesses (`lib/screens/business/business_profile_screen.dart:467`):**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* Next to the business name, the template unconditionally renders:
     ```dart
     const VerificationBadge(badgeType: 'BUSINESS_VERIFIED', size: 20)
     ```
     This bypasses `b.isVerified`, publicly presenting unverified businesses with an official yellow checkmark.
2. **Identity Switcher Operational:**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* `IdentitySwitcherBottomSheet` cleanly toggles between personal and business identities, properly persisting choice and supplying acting headers to `ApiService`.

---

## SECTION 15: Verification

### Findings
1. **Orphaned Verification Screen (`lib/screens/settings/verification_screen.dart`):**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* `VerificationScreen` implements full government ID submission and status verification. However, `SettingsScreen:336` sets the verification tile's `onTap` to `_launchAdvertiserPortal`, launching `https://peto-web.onrender.com/advertiser`. The Flutter verification screen cannot be reached anywhere in the app.
2. **Conflation with Advertising:**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* Direct violation of product specification: "Verification is independent from advertising. Do not recommend merging verification into advertiser functionality."

---

## SECTION 16: Notifications & Saved Content

### Findings
1. **Infinite Scroll Pagination:**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* `NotificationScreen` implements a lazy scroll listener at `maxScrollExtent - 200` to fetch pages incrementally.
2. **Post Routing with Comment Expansion:**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* Tapping comment notifications opens `PostDetailScreen` with `autoOpenComments: true`.

---

## SECTION 17: Settings

### Findings
1. **Missing Theme Preference & Dark Mode:**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* `SettingsScreen` lacks any theme selector because dark mode is not implemented in `AppTheme`.
2. **Redundant Legal Policy Disclaimers:**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* Line 431 renders generic legal boilerplate text ("All policies and verified guidelines legally binding") that adds no functional value.

---

## SECTION 18: Forms, Keyboard & Mobile Ergonomics

### Findings
1. **Form Deprecations (`lib/widgets/pet_showcase_section.dart:1749,1803,1876,1945`):**
   - *Evidence Level:* `LOG CONFIRMED`
   - *Observed:* `flutter analyze` flags 4 instances of deprecated `value` parameter in `DropdownButtonFormField`.
2. **Keyboard Inset Handling:**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* Bottom sheets (`CommentsBottomSheet`, `_AddPetBottomSheet`) correctly add `MediaQuery.of(context).viewInsets.bottom` to avoid content being concealed behind the virtual keyboard.

---

## SECTION 19: Responsive Layout & Safe Areas

### Findings
1. **Viewport Geometry on Physical Test Phone:**
   - *Evidence Level:* `RUNTIME CONFIRMED` (via ADB)
   - *Device:* Nothing A059 (1080x2392 @ 420 dpi). Logical height is 911dp. Layouts have ample vertical space, but smaller devices (e.g. 360x640dp) will experience severe clipping on long modal forms unless scrolled.
2. **Safe Area Protection in Reels Controls:**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* Top back button uses `MediaQuery.of(context).padding.top + 8` to avoid camera punch-hole clipping.

---

## SECTION 20: Accessibility

### Findings
1. **Unlabeled Icon-Only Action Buttons:**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* In `lib/widgets/post_card.dart` and `lib/screens/reels/reels_screen.dart`, several `IconButton` widgets (e.g. like, save, comment) lack `Semantics(label: ...)` or `tooltip` properties, making them difficult to navigate using Android TalkBack.
2. **Touch Target Dimensions:**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* Close icons on image previews and filter chips measure under 32x32 dp, falling short of the recommended 48x48 dp Android touch target guideline.

---

## SECTION 21: Media Handling

### Findings
1. **Cached Image Error Builders:**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* Most `CachedNetworkImage` instances provide fallback icon widgets (`Icons.pets`) to prevent crashes on network drops.
2. **Multi-Image Carousel Constraints (`lib/widgets/post_card.dart:709`):**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* Constrained with `minHeight: 180, maxHeight: 480` to prevent infinite height layout explosions.

---

## SECTION 22: Performance

### Findings
1. **Scroll Frame Jank Risk:**
   - *Evidence Level:* `SOURCE RISK — RUNTIME TEST REQUIRED`
   - *Observed:* Due to the unvirtualized `SingleChildScrollView` + `ListView` pattern in `HomeScreen`, loading 50+ posts will cause severe garbage collection jank on mid-range physical devices.
2. **Static Code Quality:**
   - *Evidence Level:* `LOG CONFIRMED`
   - *Observed:* `flutter analyze` returned 0 compilation errors and 7 minor info notices (`unnecessary_this`, deprecated `withOpacity`, deprecated FormField `value`).

---

## SECTION 23: Network/API & Error Handling

### Findings
1. **Exposure of Internal Endpoint URL in User Dialog (`lib/screens/main_shell.dart:73`):**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* The health check failure dialog displays `SelectableText('https://peto-web.onrender.com/health')` directly to end users.
   - *Fix:* Replace technical URLs with user-friendly language ("Could not reach Peto network servers").
2. **401 Token Refresh Interceptor:**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* `ApiService` lines 76–109 cleanly implement automatic token refresh against `/auth/refresh` on HTTP 401.

---

## SECTION 24: Privacy & Security UX

### Findings
1. **Pet Privacy Clear in UI:**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* Pet visibility (`PUBLIC`, `CONNECTIONS`, `PRIVATE`) is visually indicated by color-coded badges on `PetProfileScreen`.
2. **Document Upload Security in Verification:**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* Document image paths in `VerificationScreen` are sent to the private verification endpoint and never cached in public social feeds.

---

## SECTION 25: Generic / AI-Generated UI Pattern Findings

The following patterns contribute to a generic "AI-built" SaaS appearance and should be prioritized for aesthetic cleanup in the future visual polish phase:
1. **Pill Badges Everywhere:** Excessive pill containers with icons (e.g. "Step 1 of 2 • Account Info", "Unexpected Server Hiccup • HTTP 500").
2. **Card-in-Card Nesting:** In `profile_screen.dart`, business profiles and pet showcases are cards nested inside the main scroll card container.
3. **Overuse of `rounded-2xl` (20–24px radii):** Almost every modal, text field, and card uses an exaggerated `BorderRadius.circular(20)` or `24`.
4. **Repetitive Equal Padding:** Rigid `EdgeInsets.all(16)` or `24` across all components with little typographic contrast.
5. **Generic Microcopy:** Text like "Your companion pet community awaits" and "Something Barked on Our End".

---

## SECTION 26: Cross-Screen Design Consistency

### Findings
1. **Secondary Color Clash (`lib/theme/app_theme.dart:18`):**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* `AppColors.secondary` is set to `Color(0xFF0058BE)` (royal blue). While Peto Web recently removed this blue in favor of warm ambers and earthy tones, the Flutter app still uses this blue for text links, outlines, and buttons.
2. **Dark Mode Missing:**
   - *Evidence Level:* `SOURCE CONFIRMED`
   - *Observed:* `MaterialApp` in `lib/main.dart` only defines `theme: AppTheme.lightTheme`. There is no dark theme implementation.

---

## SECTION 27: Runtime / Physical Device Findings

### Verified Device Metrics (Nothing A059 / Android 16)
- **App Startup (`adb shell am start`):**
  - Package `com.peto.jr` launched successfully to `MainActivity`.
  - Android 16 system window focus was confirmed via `dumpsys window`.
  - App displays splash logo, waits 1.8 seconds, and transitions into `MainShell`.
- **System Navigation Insets:**
  - On full-gesture navigation pill, bottom bar clearance is required to prevent Reels scrubber collisions.
- **Physical Memory Profile:**
  - With unvirtualized feed lists, heap allocations scale linearly with feed size.

---

## SECTION 28: Complete Issue Register

| Issue ID | Severity | Category | Affected Screen / File | Evidence Level | Description | Recommended Solution |
|---|---|---|---|---|---|---|
| **MOB-ISS-001** | **P0** | SECURITY / FUNCTIONAL | `screens/business/business_profile_screen.dart:467` | `SOURCE CONFIRMED` | Yellow Business Verified badge is hardcoded on every business profile, displaying unverified businesses as verified. | Check `b.isVerified` before rendering `VerificationBadge`. |
| **MOB-ISS-002** | **P1** | NAVIGATION | `screens/settings/settings_screen.dart:336` | `SOURCE CONFIRMED` | Verification tile launches web advertiser portal instead of opening native `VerificationScreen`. | Update `onTap` to push `VerificationScreen()`. |
| **MOB-ISS-003** | **P1** | PERFORMANCE / SCROLL | `screens/home/home_screen.dart:159` | `SOURCE CONFIRMED` | `SingleChildScrollView` + `ListView(shrinkWrap: true)` defeats virtualization, risking memory crashes. | Migrate to `CustomScrollView` with `SliverList`. |
| **MOB-ISS-004** | **P1** | USER ONBOARDING | `screens/auth/create_profile_screen.dart:122` | `SOURCE CONFIRMED` | Completing profile setup calls `authProvider.logout()` and forces the user to log in again. | Maintain session and navigate directly to `MainShell`. |
| **MOB-ISS-005** | **P1** | INFORMATION ARCHITECTURE | `screens/community/community_screen.dart:86` | `SOURCE CONFIRMED` | Screen titled "Pet Circles", bottom nav labeled "Community", web canonical is "Communities". | Standardize terminology to "Communities" throughout. |
| **MOB-ISS-006** | **P2** | MEDIA / CRASH | `widgets/google_sign_in_button.dart:206` | `SOURCE CONFIRMED` | `Image.network` fails to decode Google SVG logo, always displaying error icon. | Replace with PNG asset or vector rendering widget. |
| **MOB-ISS-007** | **P2** | MOBILE USABILITY | `screens/reels/reel_video_player.dart:346` | `SOURCE CONFIRMED` | Video progress line positioned at `bottom: 0` is hidden beneath `BottomNavigationBar`. | Adjust bottom inset to sit above the navigation bar. |
| **MOB-ISS-008** | **P2** | SECURITY UX | `screens/main_shell.dart:73` | `SOURCE CONFIRMED` | Health check error dialog exposes raw internal API URL (`/health`) to users. | Replace with generic network failure copy. |
| **MOB-ISS-009** | **P2** | VISUAL CONSISTENCY | `theme/app_theme.dart:18` | `SOURCE CONFIRMED` | Secondary color is legacy royal blue (`0x0058BE`), clashing with web's warm amber palette. | Align color tokens with web consumer palette. |
| **MOB-ISS-010** | **P2** | SEARCH UX | `screens/search/search_screen.dart:287` | `SOURCE CONFIRMED` | Missing entity tabs for Pets and Businesses; shows "Posts (0)" on initial load. | Add Pet/Business tabs; hide zero counts prior to search. |
| **MOB-ISS-011** | **P2** | MOBILE ERGONOMICS | `screens/profile/profile_screen.dart:143` | `SOURCE CONFIRMED` | Tapping post in grid opens full `PostCard` in an `AlertDialog` instead of navigating to `PostDetailScreen`. | Navigate to `PostDetailScreen`. |
| **MOB-ISS-012** | **P3** | METADATA | `android/app/src/main/AndroidManifest.xml:9` | `SOURCE CONFIRMED` | Android app label is set to `peto_user` instead of `Peto`. | Change `android:label` to "Peto". |
| **MOB-ISS-013** | **P3** | STATIC ANALYSIS | `widgets/pet_showcase_section.dart:1749` | `LOG CONFIRMED` | 4 deprecated `value` parameters in `DropdownButtonFormField`. | Migrate to `initialValue`. |
| **MOB-ISS-014** | **P3** | DATE FORMATTING | `widgets/post_card.dart:356` | `SOURCE CONFIRMED` | Post card uses absolute calendar date instead of relative time ago. | Format using relative time ("2h ago"). |
| **MOB-ISS-015** | **P3** | ARCHITECTURE | `widgets/pet_showcase_section.dart` | `SOURCE CONFIRMED` | Monolithic 2,747-line widget file combines showcase cards, forms, and pickers. | Decompose into focused sub-widgets during future refactoring. |

---

## SECTION 29: Prioritized Remediation Roadmap

```
PHASE 1: CRITICAL P0 & P1 DEFECTS (FUNCTIONAL & SECURITY UX)
├── Fix hardcoded Business Verified badge (MOB-ISS-001)
├── Wire Settings Verification tile to native VerificationScreen (MOB-ISS-002)
├── Remove forced logout upon onboarding completion (MOB-ISS-004)
└── Mask internal API URL in health check dialog (MOB-ISS-008)

PHASE 2: PERFORMANCE & SCROLL VIRTUALIZATION
├── Migrate HomeScreen to CustomScrollView + SliverList (MOB-ISS-003)
├── Migrate CommunityScreen to virtualized list (MOB-ISS-005)
└── Migrate ProfileScreen post list to virtualized slivers

PHASE 3: INFORMATION ARCHITECTURE & NAVIGATION ALIGNMENT
├── Standardize "Communities" across bottom nav, headers, and buttons
├── Standardize bottom nav Tab 2 label to "Explore"
└── Add Pet and Business search tabs in SearchScreen (MOB-ISS-010)

PHASE 4: MOBILE USABILITY & COMPONENT FIXES
├── Replace broken Google SVG with raster asset (MOB-ISS-006)
├── Lift Reels progress scrubber above bottom nav bar (MOB-ISS-007)
├── Replace profile grid AlertDialog with PostDetailScreen navigation (MOB-ISS-011)
└── Fix Android app label in Manifest (MOB-ISS-012)

PHASE 5: ACCESSIBILITY, FORM DEPRECATIONS & POLISH
├── Resolve 4 FormField deprecations in pet showcase (MOB-ISS-013)
├── Add Semantics and tooltips to icon-only buttons
├── Standardize post card timestamps to relative time (MOB-ISS-014)
└── Decompose monolithic pet_showcase_section.dart (MOB-ISS-015)

PHASE 6: DESIGN SYSTEM & ELIMINATING AI-GENERATED UI
├── Align mobile color tokens with web design system (purge #0058BE)
├── Reduce excessive border radii and redundant container nesting
└── Implement Dark Mode support in MaterialApp and AppTheme
```

---

## SECTION 30: Manual Regression Test Checklist

The following test cases are prepared for the developer to execute on the physical Android phone:

- [ ] **MOB-001 (App Launch):** Cold launch app from device launcher. Verify app name under icon reads "Peto" (not `peto_user`) and transitions smoothly to feed.
- [ ] **MOB-002 (Google Sign-In Button):** Navigate to Login screen. Verify Google logo renders crisp and clear without falling back to the generic `G` icon.
- [ ] **MOB-003 (Registration & Onboarding Continuity):** Register a new account and complete profile setup. Verify user is taken directly into the feed *without* being logged out.
- [ ] **MOB-004 (Feed Virtualization):** Scroll through 50+ posts in the home feed. Observe frame rate and verify no sluggishness or OOM crashes occur.
- [ ] **MOB-005 (Reels Progress Bar Visibility):** Open Reels tab. Verify the video scrubber line is visible above the bottom navigation bar and can be scrubbed.
- [ ] **MOB-006 (Search Entity Filtering):** Search for a query. Verify tabs exist for Posts, People, Pets, and Communities. Verify no "0" counts appear on initial empty search.
- [ ] **MOB-007 (Community Naming):** Open Communities tab. Verify header says "Communities" (not "Pet Circles") and create button says "Create Community".
- [ ] **MOB-008 (Business Verification Accuracy):** View an unverified business profile. Verify the yellow verified badge is NOT displayed. View a verified business; verify badge displays.
- [ ] **MOB-009 (Verification Navigation):** Open Settings -> Verification. Verify the native blue-tick verification form opens, rather than launching an external browser to the advertiser portal.
- [ ] **MOB-010 (Profile Post Tap):** In personal profile grid view, tap a post thumbnail. Verify it navigates to full `PostDetailScreen` rather than an `AlertDialog`.
- [ ] **MOB-011 (Add Pet Form & Keyboard):** In profile, tap "Add Pet". Focus the last bio text field. Verify form scrolls up cleanly and the Save button remains accessible above the keyboard.
- [ ] **MOB-012 (Identity Switching Attribution):** Switch to a managed business via identity switcher. Create a test post. Verify the post displays the business as author, not the personal human profile.

---

## SECTION 31: Conclusion

The Peto Flutter mobile application features a solid architectural foundation with proper social identity separation between humans, companion pets, and managed businesses. However, critical usability defects, performance hazards in feed scrolling, broken navigation to verification, and hardcoded verification badges require targeted remediation before visual design polish begins.

Following the prioritized roadmap in **Section 29** will stabilize the mobile experience and prepare it for unified design-system harmonization with Peto Web.

---
*End of Audit Report.*
