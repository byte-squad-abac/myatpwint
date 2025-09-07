import Card from '@/components/ui/Card'

type SalesStats = {
  totalSales: number
  totalRevenue: number
  digitalSales: number
  physicalSales: number
  uniqueCustomersCount: number
  uniqueBooksCount: number
}

interface SalesOverviewCardsProps {
  stats: SalesStats
  showOnlyBooksWithSales: boolean
  onToggleFilter: () => void
}

export default function SalesOverviewCards({ 
  stats, 
  showOnlyBooksWithSales, 
  onToggleFilter 
}: SalesOverviewCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Revenue */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-emerald-200">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-emerald-700 font-medium uppercase tracking-wide">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalRevenue.toLocaleString()} <span className="text-sm text-gray-600">MMK</span>
            </p>
            <div className="flex items-center space-x-2 mt-1">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-xs text-blue-600">{stats.digitalSales} digital</span>
                <div className="w-2 h-2 bg-green-400 rounded-full ml-2"></div>
                <span className="text-xs text-green-600">{stats.physicalSales} physical</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Total Sales */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-blue-200">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-blue-700 font-medium uppercase tracking-wide">Total Sales</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalSales}</p>
            <div className="flex items-center space-x-2 mt-1">
              <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
              <span className="text-xs text-blue-600">Individual purchases</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Books */}
      <Card className="bg-gradient-to-br from-purple-50 to-violet-100 border-2 border-purple-200">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm text-purple-700 font-medium uppercase tracking-wide">Books</p>
            <p className="text-2xl font-bold text-gray-900">{stats.uniqueBooksCount}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 mt-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span className="text-xs text-purple-600">With sales</span>
              </div>
              <div 
                onClick={onToggleFilter}
                className="cursor-pointer ml-2"
                title={showOnlyBooksWithSales ? "Show all books" : "Show only books with sales"}
              >
                <span className={`text-xs px-2 py-1 rounded-full ${
                  showOnlyBooksWithSales 
                    ? 'bg-purple-200 text-purple-800' 
                    : 'bg-gray-200 text-gray-600 hover:bg-purple-100'
                }`}>
                  {showOnlyBooksWithSales ? 'Filtering active' : 'Click to filter'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Customers */}
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-orange-200">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-orange-700 font-medium uppercase tracking-wide">Customers</p>
            <p className="text-2xl font-bold text-gray-900">{stats.uniqueCustomersCount}</p>
            <div className="flex items-center space-x-2 mt-1">
              <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
              <span className="text-xs text-orange-600">Unique buyers</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}