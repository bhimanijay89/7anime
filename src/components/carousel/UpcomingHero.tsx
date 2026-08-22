import {
    ChevronLeft,
    ChevronRight,
    Clock3,
} from 'lucide-react'
import {
    useCallback,
    useEffect,
    useState,
} from 'react'
import type { Anime } from '../../types/domain'
import { Badge } from '../ui/Badge'
import { IconButton } from '../ui/Button'
import './upcomingHero.css'

type UpcomingHeroProps = {
    anime: Anime[]
    onSelect?: (anime: Anime) => void
}

export function UpcomingHero({
    anime,
    onSelect,
}: UpcomingHeroProps) {
    const [activeIndex, setActiveIndex] =
        useState(0)

    const [isChanging, setIsChanging] =
        useState(false)

    const currentAnime =
        anime[activeIndex]

    const goToSlide = useCallback(
        (index: number) => {
            if (anime.length <= 1) return

            const nextIndex =
                (index + anime.length) %
                anime.length

            if (nextIndex === activeIndex) return

            setIsChanging(true)

            window.setTimeout(() => {
                setActiveIndex(nextIndex)

                window.setTimeout(() => {
                    setIsChanging(false)
                }, 80)
            }, 180)
        },
        [activeIndex, anime.length],
    )

    const nextSlide = useCallback(() => {
        goToSlide(activeIndex + 1)
    }, [activeIndex, goToSlide])

    const previousSlide = useCallback(() => {
        goToSlide(activeIndex - 1)
    }, [activeIndex, goToSlide])

    /*
     * Automatic slider
     */
    useEffect(() => {
        if (anime.length <= 1) return

        const timer = window.setInterval(
            () => {
                setActiveIndex(current => {
                    return (current + 1) % anime.length
                })
            },
            6000,
        )

        return () => {
            window.clearInterval(timer)
        }
    }, [anime.length])

    /*
     * Reset index if API data changes
     */
    useEffect(() => {
        if (
            activeIndex >= anime.length &&
            anime.length > 0
        ) {
            setActiveIndex(0)
        }
    }, [activeIndex, anime.length])

    if (!currentAnime) {
        return null
    }

    const backgroundImage =
        currentAnime.cover ||
        currentAnime.poster

    return (
        <section
            className={`upcoming-hero ${isChanging
                    ? 'upcoming-hero--changing'
                    : ''
                }`}
            aria-label="Upcoming anime"
        >
            {/* Cinematic background */}
            <div
                className="upcoming-hero__background"
                style={{
                    backgroundImage: `url("${backgroundImage}")`,
                }}
                aria-hidden="true"
            />

            {/* Dark cinematic overlays */}
            <div
                className="upcoming-hero__gradient"
                aria-hidden="true"
            />

            <div
                className="upcoming-hero__vignette"
                aria-hidden="true"
            />

            {/* Clickable hero */}
            <button
                className="upcoming-hero__click-area"
                onClick={() =>
                    onSelect?.(currentAnime)
                }
                aria-label={`Open ${currentAnime.title}`}
            >
                {/* Content */}
                <div className="upcoming-hero__content">

                    <div className="upcoming-hero__eyebrow">
                        <span className="upcoming-hero__eyebrow-line" />
                        <span>UPCOMING ANIME</span>
                    </div>

                    {(() => {
                        const len = currentAnime.title.length
                        const titleClass =
                            len > 60
                                ? 'upcoming-hero__title upcoming-hero__title--long-xl'
                                : len > 35
                                    ? 'upcoming-hero__title upcoming-hero__title--long'
                                    : 'upcoming-hero__title'
                        return (
                            <h2 className={titleClass}>
                                {currentAnime.title}
                            </h2>
                        )
                    })()}

                    <div className="upcoming-hero__meta">
                        {currentAnime.type && (
                            <Badge tone="neutral">
                                {currentAnime.type}
                            </Badge>
                        )}

                        {currentAnime.year && (
                            <Badge tone="neutral">
                                {currentAnime.year}
                            </Badge>
                        )}

                        <Badge tone="warning">
                            Coming Soon
                        </Badge>
                    </div>

                    {currentAnime.genres &&
                        currentAnime.genres.length > 0 && (
                            <div className="upcoming-hero__genres">
                                {currentAnime.genres
                                    .slice(0, 3)
                                    .map(genre => (
                                        <span key={genre}>
                                            {genre}
                                        </span>
                                    ))}
                            </div>
                        )}

                    {currentAnime.synopsis && (
                        <p className="upcoming-hero__synopsis">
                            {currentAnime.synopsis}
                        </p>
                    )}

                    <div className="upcoming-hero__hint">
                        <Clock3 size={14} />
                        <span>
                            Coming soon to 7anime
                        </span>
                    </div>
                </div>

                {/* Floating poster */}
                <div className="upcoming-hero__poster">
                    <img
                        src={currentAnime.poster}
                        alt={currentAnime.title}
                    />

                    <div className="upcoming-hero__poster-glow" />

                    <span className="upcoming-hero__poster-label">
                        UPCOMING
                    </span>
                </div>
            </button>

            {/* Slider controls */}
            {anime.length > 1 && (
                <>
                    <div className="upcoming-hero__arrows">
                        <IconButton
                            label="Previous upcoming anime"
                            onClick={event => {
                                event.stopPropagation()
                                previousSlide()
                            }}
                        >
                            <ChevronLeft size={20} />
                        </IconButton>

                        <IconButton
                            label="Next upcoming anime"
                            onClick={event => {
                                event.stopPropagation()
                                nextSlide()
                            }}
                        >
                            <ChevronRight size={20} />
                        </IconButton>
                    </div>

                    <div className="upcoming-hero__pagination">
                        {anime.map((item, index) => (
                            <button
                                key={item.id}
                                className={`upcoming-hero__dot ${index === activeIndex
                                        ? 'upcoming-hero__dot--active'
                                        : ''
                                    }`}
                                onClick={event => {
                                    event.stopPropagation()
                                    goToSlide(index)
                                }}
                                aria-label={`Show ${item.title}`}
                                aria-current={
                                    index === activeIndex
                                        ? 'true'
                                        : undefined
                                }
                            />
                        ))}
                    </div>
                </>
            )}

            <div className="upcoming-hero__counter">
                <strong>
                    {String(activeIndex + 1).padStart(
                        2,
                        '0',
                    )}
                </strong>

                <span>/</span>

                <span>
                    {String(anime.length).padStart(
                        2,
                        '0',
                    )}
                </span>
            </div>
        </section>
    )
}