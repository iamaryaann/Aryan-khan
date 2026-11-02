# LPU Campus Hub

An independent student guide for Lovely Professional University, built as a mobile-friendly installable web app.

**[Open the live app](https://gleeful-vacherin-699b68.netlify.app/)** · **[Download the Android app](https://gleeful-vacherin-699b68.netlify.app/LPU_Campus_Hub.apk)**

## App screens

- Separate screens for academics, events, sports, hostels, mess, maps and campus services
- Student search, daily dashboard, timetable, reminders, CA planner and SGPA estimate
- Mess notes, meal ratings, personal events, laundry and transport tools
- Lost-and-found notes, feedback drafts, offline status and academic calendar
- Community board with posts sent to the shared backend for owner review
- Owner moderation screen for approving or hiding shared posts
- Personal service-request notes with a direct UMS / RMS link
- Dark mode, English / Hindi / Punjabi controls and mobile navigation
- Export/import backup for personal notes when moving phones

## Shared data and privacy

The shared board uses a Netlify Function and Netlify Blobs in Singapore. Public submissions are stored as pending and appear to other visitors only after the owner approves them. The admin key is read from the Netlify environment variable `LPU_HUB_ADMIN_KEY`; it is not part of the app files or GitHub repository. Entering the key on the moderation screen keeps it in that browser tab only.

The board does not request a name, phone number, email or student ID. It rejects links and likely phone/email details. Avoid posting private information anyway. Timetables, planner items, menu notes, ratings, feedback, service-request notes and reminder data remain in local browser storage and are not sent to the backend. Official requests still go through LPU UMS / RMS.

## Build and deploy on Netlify

The project uses `npm run build` to prepare the static files in `dist/`; Netlify publishes that folder and deploys the function from `netlify/functions/`. Connect the repository to the existing Netlify project, set the production environment variable `LPU_HUB_ADMIN_KEY` to a random secret of at least 24 characters, then deploy. Never put the key in source control. The GitHub Pages copy, if enabled, is static and does not provide the shared backend.

On Android, open the HTTPS app in Chrome and choose **Install app** or **Add to Home screen**.

## Project status

LPU Campus Hub is an independent student project and is not an official LPU app. It does not access private UMS accounts or provide live university notices. Confirm dates, fees, room availability, meal schedules and current policies with the university.
