// The API and FFmpeg share the instance's memory. Never start two video
// pipelines in this process; mobile clients retain and retry a busy upload.
export class VideoCapacity {
    private active = false;
    acquire(): () => void {
        if (this.active) {
            throw Object.assign(new Error("Another video is being processed. Your saved upload can retry shortly."), {
                status: 503, code: "VIDEO_PROCESSING_BUSY",
            });
        }
        this.active = true;
        let released = false;
        return () => {
            if (!released) { released = true; this.active = false; }
        };
    }
}
export const videoCapacity = new VideoCapacity();
