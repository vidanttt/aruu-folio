export default function MobileFooter() {
    return (
        <footer className="w-full border-t border-black bg-white">
            <div className="relative min-h-[220px] w-full overflow-hidden bg-white">
                <img
                    src="/footer-pattern.svg"
                    alt=""
                    aria-hidden="true"
                    className="pointer-events-none absolute right-[calc(-8%_-_120px)] top-[calc(50%_+_40px)] h-[130%] w-auto max-w-none -translate-y-1/2 object-contain"
                />

                <div className="relative z-10 flex flex-col gap-2 px-4 py-6 font-['Degular'] text-black">
                    <a
                        href="https://mail.google.com/mail/?view=cm&fs=1&to=wrk@aruu.fr"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col origin-left leading-none"
                    >
                        <span className="text-[18px] font-normal tracking-[-0.04em]">
                            Mail
                        </span>
                        <span className="scale-x-[1.08] origin-left text-[27px] font-semibold tracking-[-0.06em]">
                            wrk@aruu.fr
                        </span>
                    </a>

                    <a
                        href="https://www.instagram.com/aruuforeal/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col origin-left leading-none"
                    >
                        <span className="text-[18px] font-normal tracking-[-0.04em]">
                            Insta
                        </span>
                        <span className="scale-x-[1.08] origin-left text-[27px] font-semibold tracking-[-0.06em]">
                            @aruuforeal
                        </span>
                    </a>

                    <a
                        href="tel:+916006087997"
                        className="flex flex-col origin-left leading-none"
                    >
                        <span className="text-[18px] font-normal tracking-[-0.04em]">
                            Phone
                        </span>
                        <span className="scale-x-[1.08] origin-left text-[27px] font-semibold tracking-[-0.06em]">
                            +91 6006087997
                        </span>
                    </a>
                </div>
            </div>
        </footer>
    );
}
