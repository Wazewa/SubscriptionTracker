import { useParams } from 'react-router-dom';
import SubscriptionEditor from '../components/SubscriptionEditor';
export default function EditSubscription() {
  const { id } = useParams();
  return <SubscriptionEditor id={id} />;
}
