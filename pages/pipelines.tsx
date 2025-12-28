import type {GetServerSideProps} from 'next';

export const getServerSideProps: GetServerSideProps = async () => ({
    redirect: {
        destination: '/projects#pipeline-metrics',
        permanent: false,
    },
});

export default function PipelinesRedirect() {
    return null;
}
