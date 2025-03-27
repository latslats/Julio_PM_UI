import { Link } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-50 to-primary-50 p-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-9xl font-bold text-primary-400">404</h1>
        <h2 className="text-2xl font-semibold text-secondary-900 mt-4">Page not found</h2>
        <p className="text-secondary-600 mt-2">
          The page you are looking for doesn't exist or has been moved.
        </p>
        <Link 
          to="/"
          className="mt-6 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-600"
        >
          <FiArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}

export default NotFound
