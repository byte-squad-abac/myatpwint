import Card from '@/components/ui/Card'

type CurrentMonthData = {
  total_sales: number
  total_revenue: number
  digital_sales: number
  physical_sales: number
  unique_customers: number
  unique_books_sold: number
}

interface CurrentMonthPerformanceProps {
  currentMonth: CurrentMonthData
  isRefreshingSales: boolean
  lastSalesUpdate: Date | null
}

export default function CurrentMonthPerformance({
  currentMonth,
  isRefreshingSales,
  lastSalesUpdate
}: CurrentMonthPerformanceProps) {
  return (
    <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Current Month Performance</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            isRefreshingSales ? 'bg-orange-400 animate-pulse' : 'bg-green-400 animate-pulse'
          }`}></div>
          <div className="text-right">
            <span className={`text-sm font-medium ${
              isRefreshingSales ? 'text-orange-600' : 'text-green-600'
            }`}>
              {isRefreshingSales ? 'Refreshing...' : 'Live Data'}
            </span>
            {lastSalesUpdate && !isRefreshingSales && (
              <div className="text-xs text-gray-500">
                Updated {lastSalesUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Copies</p>
          <p className="text-xl font-bold text-gray-900">{currentMonth.total_sales}</p>
          <p className="text-xs text-gray-400 mt-1">Individual purchases</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Monthly Revenue</p>
          <p className="text-xl font-bold text-gray-900">
            {currentMonth.total_revenue.toLocaleString()} <span className="text-sm text-gray-600">MMK</span>
          </p>
          <p className="text-xs text-gray-400 mt-1">Total earnings</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">New Customers</p>
          <p className="text-xl font-bold text-gray-900">{currentMonth.unique_customers}</p>
          <p className="text-xs text-gray-400 mt-1">First-time buyers</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Active Titles</p>
          <p className="text-xl font-bold text-gray-900">{currentMonth.unique_books_sold}</p>
          <p className="text-xs text-gray-400 mt-1">Different books sold</p>
        </div>
      </div>
    </Card>
  )
}