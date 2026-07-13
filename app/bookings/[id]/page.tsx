import { BookingDetail } from '@/components/booking-detail';
export default function Page({ params }: { params: { id: string } }) {
    return <BookingDetail id={params.id} />
}
